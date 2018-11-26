import * as React from "react";
import { connect } from "react-redux";
import {
  getCoupleWellPath,
  getWellCurve,
  getTracePath,
  getAllTrack
} from "../action/changeWell";
import { changeSvgSize } from "../action/changeWellMatchSvg";
import * as d3 from "d3";
import Tracker from "../API/tracking";
const mapStateToProps = (state: any, ownProps?: any) => {
  const {
    wellMinDepth,
    wellMaxDepth,
    wellMatchSvgHeight,
    wellMatchSvgWidth,
    wellMatchSvgPaddingRatio,
    wellMatchDepthScale,
    depthList
  } = state.globalVarReducer;

  const {
    coupleWell,
    coupleWellPath,
    figURI,
    wellIDNearLine,
    wellIDNearLineIndex,
    curvePaths,
    matrixData,
    paths,
    allTrack
  } = state.wellReducer;

  return {
    wellMinDepth,
    wellMaxDepth,
    scale: wellMatchDepthScale,
    width: wellMatchSvgWidth,
    height: wellMatchSvgHeight,
    paddingRatio: wellMatchSvgPaddingRatio,
    coupleWell,
    coupleWellPath,
    figURI,
    wellIDNearLine,
    wellIDNearLineIndex,
    curvePaths,
    matrixData,
    depthList,
    paths,
    allTrack
  };
};

const mapDispatchToProps = {
  getCoupleWellPath,
  changeSvgSize,
  getWellCurve,
  getTracePath,
  getAllTrack
};

interface Props {
  readonly wellMinDepth: number;
  readonly wellMaxDepth: number;
  scale: any;
  width: number;
  height: number;
  paddingRatio: number;
  coupleWell: any;
  coupleWellPath: any;
  figURI: string;
  wellIDNearLine: string[];
  getCoupleWellPath: any;
  changeSvgSize: any;
  wellIDNearLineIndex: any;
  getWellCurve: any;
  curvePaths: any;
  matrixData: any;
  depthList: number[];
  paths: any;
  getTracePath: any;
  getAllTrack: any;
  allTrack: any;
}

interface State {
  colorScale: any;
  pathGen: any;
}

class WellMatch extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    //do not store in `redux store` temporarily
    this.state = {
      colorScale: d3.scaleOrdinal(d3.schemeCategory10),
      pathGen: d3
        .line()
        .x(d => d[0])
        .y(d => d[1])
      //.curve(d3.curveCardinal)
    };
    this.drawMatch = this.drawMatch.bind(this);
    this.drawTrace = this.drawTrace.bind(this);
  }

  componentDidUpdate(prevProps: any) {
    const { coupleWell, changeSvgSize, matrixData, width } = this.props;

    if (matrixData && matrixData !== prevProps.matrixData) {
      changeSvgSize(20 * matrixData.length, matrixData[0].length * 5);
    }
    if (width !== prevProps.width) {
      this.drawMatch();
      this.drawTrace();
    }
  }

  drawTrace() {
    const {
      width,
      paddingRatio,
      scale,
      matrixData,
      depthList,
      getTracePath,
      getAllTrack
    } = this.props;
    const trakcer = new Tracker();
    const drawWidth = width * (1 - 2 * paddingRatio);
    const pad = drawWidth / matrixData.length;
    //set xOffsetScope a litter bigger than `pad/2`
    const xOffsetScope = pad / 0.8;
    const xScale = d3
      .scaleLinear()
      .domain([-13685.379, 13685.379])
      .range([-xOffsetScope, xOffsetScope]);
    const allPeaks = [];
    const positivePaths: [number, number][][] = [];
    const negativePaths: [number, number][][] = [];
    const paths = [];
    for (let i = 0; i < matrixData.length; i++) {
      let positivePath: [number, number][] = [];
      let negativePath: [number, number][] = [];
      const x = pad * i + pad / 2;
      for (let j = 0; j < matrixData[i].length; j++) {
        const xOffset = matrixData[i][j] === 0 ? 0 : xScale(matrixData[i][j]);
        const p1: [number, number] = [x, scale(depthList[j])];
        const p2: [number, number] = [
          x + xOffset,
          (scale(depthList[j]) + scale(depthList[j + 1])) / 2
        ];
        const p3: [number, number] = [
          x,
          (scale(depthList[j]) + scale(depthList[j + 1])) / 2
        ];
        if (xOffset > 0) {
          positivePath.push(p1, p2);
          negativePath.push(p1, p3);
        } else {
          positivePath.push(p1, p3);
          negativePath.push(p1, p2);
        }
      }

      positivePath = trakcer.clearSawtooth(positivePath, x, true);
      negativePath = trakcer.clearSawtooth(negativePath, x, false);

      const peaks = [
        ...trakcer.extractPeaks(positivePath, x),
        ...trakcer.extractPeaks(negativePath, x)
      ];
      allPeaks.push(peaks);
      //loop the positivePath to ensure it's closed so that css `fill` works
      positivePath.push([x, scale(depthList[matrixData[0].length + 1])]);
      positivePath.push([x, scale(depthList[0])]);
      negativePath.push([x, scale(depthList[matrixData[0].length + 1])]);

      positivePaths.push(positivePath);
      negativePaths.push(negativePath);
    }
    console.log("allPeaks: ", allPeaks);
    const allTracks: any = [];
    for (let i = 0; i < allPeaks.length / 2; i++) {
      allTracks.push(...trakcer.tracking(allPeaks, i));
    }

    trakcer.cutOffAllTracks(allTracks, allPeaks.length);
    console.log("allTracks: ", allTracks);

    paths.push(positivePaths, negativePaths);

    //draw tracking line
    getAllTrack(allTracks);
    //draw trace
    getTracePath(paths);
  }

  drawMatch() {
    const { wellIDNearLine, matrixData } = this.props;
    if (!wellIDNearLine) return;
    fetch(`http://localhost:5000/nearLineCurve/`, {
      body: JSON.stringify(wellIDNearLine),
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      method: "POST",
      mode: "cors"
    })
      .then(res => res.json())
      .then(data => {
        console.log("data: ", data);
        const {
          width,
          paddingRatio,
          scale,
          wellIDNearLineIndex,
          getWellCurve
        } = this.props;
        console.log("wellIDNearLineIndex: ", wellIDNearLineIndex);
        const drawWidth = width * (1 - 2 * paddingRatio);
        const pad = drawWidth / matrixData.length;
        let layerIndexList: number[] = [];
        for (let i = 0; i < data[0].value.length; i++) {
          if (
            data[0].value[i].topDepth &&
            data[data.length - 1].value[i].topDepth
          ) {
            layerIndexList.push(i);
          }
        }
        const paths = [];
        for (let i = 0; i < layerIndexList.length; i++) {
          const index = layerIndexList[i];
          const topPath = [];
          const bottomPath = [];
          for (let j = 0; j < data.length; j++) {
            const x =
              wellIDNearLineIndex[j] * (matrixData.length - 1) * pad + pad / 2;
            const value = data[j].value;
            if (value[index].topDepth) {
              const topY = scale(value[index].topDepth);
              const bottomY = scale(value[index].bottomDepth);
              topPath.push([x, topY]);
              bottomPath.push([x, bottomY]);
            } else {
              topPath.push([x, null]);
              bottomPath.push([x, null]);
            }
          }
          for (let i = 0; i < topPath.length; i++) {
            if (topPath[i][1] === null) {
              topPath[i][1] = topPath[i - 1][1];
              bottomPath[i][1] = bottomPath[i - 1][1];
            }
          }
          paths.push([...topPath, ...bottomPath.reverse()]);
        }

        for (let i = 0; i < paths.length; i++) {
          paths[i].push(paths[i][0]);
        }
        getWellCurve(paths);
      });
  }

  calUncertainty() {}

  render() {
    const { width, height, curvePaths, paths, allTrack } = this.props;
    const { colorScale, pathGen } = this.state;
    let curves = null;
    if (curvePaths) {
      curves = curvePaths.map((e: any, i: number) => {
        let pathD = pathGen(e);
        let style = { fill: "grey", stroke: "none", fillOpacity: 0.8 };
        return (
          <path key={i} d={pathD} style={style} className="well-match-axis" />
        );
      });
    }

    let positivePaths = null;
    let negativePaths = null;
    if (paths) {
      positivePaths = paths[0].map((e: any, i: number) => {
        let pathD = pathGen(e);
        let style = { fill: "black", stroke: "black", strokeWidth: 0.3 };
        return <path key={i} d={pathD} style={style} className="trace-path" />;
      });
      negativePaths = paths[1].map((e: any, i: number) => {
        let pathD = pathGen(e);
        let style = { fill: "none", stroke: "black", strokeWidth: 0.3 };
        return <path key={i} d={pathD} style={style} className="trace-path" />;
      });
    }
    let trackPath = null;
    if (allTrack) {
      let pathGene = d3
        .line()
        .x((d: any) => {
          return d.highestX;
        })
        .y((d: any) => {
          return d.mid;
        });
      trackPath = allTrack.map((track: any, i: number) => {
        let d: any = pathGene(track);
        let style = { fill: "none", stroke: "black", strokeWidth: 1 };
        return <path key={i} d={d} style={style} className="trace-path" />;
      });
    }
    const svgStyle = { width, height: height + 15 };
    const divStyle = { width, height: height + 15 };
    return (
      <div className=" well-match-div" style={divStyle}>
        <svg className="well-match-svg" style={svgStyle}>
          {curves}
          {positivePaths}
          {negativePaths}
          {trackPath}
        </svg>
      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WellMatch);
