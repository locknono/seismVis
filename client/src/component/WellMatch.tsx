import * as React from "react";
import { connect } from "react-redux";
import {
  getCoupleWellPath,
  getWellCurve,
  getTracePath,
  getAllTrack,
  getTrackVertex,
  getUcPath,
  getAttrDiff,
  getCurIndex,
  getTopRecords,
  getRecVertex,
  getSameFlag
} from "../action/changeWell";
import { changeSvgSize } from "../action/changeWellMatchSvg";
import { changeFocus } from "../action/control";
import * as d3 from "d3";
import Tracker from "../API/tracking";
import WellAttr from "./WellAttr";
import Uncertainty, {
  getRecommendedVertex,
  getRecommendedVertexByAttrDiff,
  getRecommendedVertexByAttrDiffRecords,
  IfLeftRightOnSameLayer
} from "../API/uncertainty";
import {
  getSize,
  getWellMatchPath,
  api_getTracePath,
  ifMatchCurveEqual
} from "../API/wellMatchAPI";
import MatchCurve from "./MatchCurve";
import { v4 } from "uuid";
import { ViewHeading } from "./ViewHeading";
import {
  AllTracks,
  AllVertices,
  WellAttrData,
  AllMatchCurve,
  AllDiff,
  CurSelectedIndex,
  VertexType,
  AllRecords
} from "src/ts/Type";
import { diff, getTop10RecomendedVertex } from "../API/wellAttrDiff";
import WithButtonViewHeading from "./WithButtonViewHeading";
import Vertex from "./Vertex";
import Legend from "./Legend";
import {
  reverseScale,
  initialWellMatchDepthScale
} from "../reducer/globalVarReducer";
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
    allTrack,
    vertex,
    ucPath,
    wellAttrData,
    allDiff,
    curSelectedIndex,
    recVertex
  } = state.wellReducer;

  const { focusFlag, weightList } = state.controlReducer;
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
    allTrack,
    allTrackVertex: vertex,
    ucPath,
    wellAttrData,
    allDiff,
    curSelectedIndex,
    recVertex,
    focusFlag,
    weightList
  };
};

const mapDispatchToProps = {
  getCoupleWellPath,
  changeSvgSize,
  getWellCurve,
  getTracePath,
  getAllTrack,
  getTrackVertex,
  getUcPath,
  getAttrDiff,
  getCurIndex,
  getTopRecords,
  getRecVertex,
  getSameFlag,
  changeFocus
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
  curvePaths: AllMatchCurve;
  matrixData: any;
  depthList: number[];
  paths: any;
  getTracePath: any;
  getAllTrack: any;
  allTrack: AllTracks;
  getTrackVertex: any;
  allTrackVertex: AllVertices;
  ucPath: any[];
  getUcPath: any;
  wellAttrData: WellAttrData;
  allDiff: AllDiff;
  getAttrDiff: typeof getAttrDiff;
  curSelectedIndex: CurSelectedIndex;
  getCurIndex: typeof getCurIndex;
  getTopRecords: typeof getTopRecords;
  getRecVertex: typeof getRecVertex;
  recVertex: VertexType | undefined;
  getSameFlag: typeof getSameFlag;
  changeFocus: typeof changeFocus;
  focusFlag: boolean;
  weightList: number[];
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
    this.calUncertainty = this.calUncertainty.bind(this);
    this.changeCurvePath = this.changeCurvePath.bind(this);
    this.getRecommended = this.getRecommended.bind(this);
  }
  componentDidMount() {
    const { scale } = this.props;
    //TODO:ADD BASELINE
    const laxis = d3.axisLeft(initialWellMatchDepthScale).tickSize(3);
    const rAxis = d3.axisRight(initialWellMatchDepthScale);
    const g1 = d3
      .select(".well-match-svg")
      .append("g")
      .attr("transform", "translate(25,0)")
      .call(laxis);
    const g2 = d3
      .select(".well-match-svg")
      .append("g")
      .attr("transform", "translate(675,0)")
      .call(rAxis);

    g1.selectAll("text")
      .style("font-size", "6px")
      .style(`font-weight`, "bold");
    g2.selectAll("text")
      .style("font-size", "6px")
      .style(`font-weight`, "bold");
    g1.append("text")
      .text("depth")
      .attr("x", -4)
      .attr("y", 10)
      .style("stroke", "black")
      .style("stroke-weight", "normal")
      .style("font-family", "Arial")
      .style("font-size", "8px");
    g2.append("text")
      .text("depth")
      .attr("x", 4)
      .attr("y", 10)
      .style("stroke", "black")
      .style("stroke-weight", "normal")
      .style("font-family", "Arial")
      .style("font-size", "8px");
  }
  componentDidUpdate(prevProps: any) {
    const {
      coupleWell,
      changeSvgSize,
      matrixData,
      width,
      curvePaths,
      allTrackVertex,
      ucPath,
      weightList,
      curSelectedIndex,
      getCurIndex
    } = this.props;

    if (matrixData && matrixData !== prevProps.matrixData) {
      /*  const [width, height] = getSize(matrixData);
      changeSvgSize(width, height); */
      this.drawMatch();
      this.drawTrace();
      getCurIndex(undefined);
    }

    if (width !== prevProps.width) {
    }

    //Condition is too complex
    //Maybe i should import `immutable.js` if scale grows
    if (
      curvePaths &&
      allTrackVertex &&
      (!prevProps.curvePaths ||
        ifMatchCurveEqual(curvePaths, prevProps.curvePaths) === false)
    ) {
      this.calUncertainty();
    }
    if (prevProps.weightList !== weightList) {
      this.calUncertainty();
      this.getRecommended(curSelectedIndex as number);
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
      getAllTrack,
      getTrackVertex
    } = this.props;
    const { allTrackVertex, allTrack, paths } = api_getTracePath(
      width,
      matrixData,
      scale,
      paddingRatio,
      depthList
    );
    getTrackVertex(allTrackVertex);

    //draw tracking line
    getAllTrack(allTrack);
    //draw trace
    getTracePath(paths);
  }

  drawMatch() {
    const {
      wellIDNearLine,
      matrixData,
      width,
      paddingRatio,
      scale,
      wellIDNearLineIndex,
      getWellCurve
    } = this.props;
    if (!wellIDNearLine) return;
    getWellMatchPath(
      wellIDNearLine,
      paddingRatio,
      width,
      matrixData,
      wellIDNearLineIndex,
      scale
    ).then(paths => {
      getWellCurve(paths);
    });
  }

  calUncertainty() {
    const {
      allTrackVertex,
      curvePaths,
      getUcPath,
      coupleWell,
      paddingRatio,
      width,
      height,
      wellAttrData,
      scale,
      getAttrDiff,
      weightList
    } = this.props;
    const allDiff = diff(wellAttrData, curvePaths, weightList);
    getAttrDiff(allDiff);

    const uc = new Uncertainty();
    const ucPath = uc.cal(
      allTrackVertex,
      curvePaths,
      width,
      paddingRatio,
      height
    ).path;
    const ucList = uc.cal(
      allTrackVertex,
      curvePaths,
      width,
      paddingRatio,
      height
    ).ucList;
    const ucSum = uc.getUcSum(ucList);

    const id1 = coupleWell[0];
    const id2 = coupleWell[1];
    const coupleWellUc = {
      id1,
      id2,
      value: ucSum
    };

    getUcPath(ucPath);
    fetch(`http://localhost:5000/storeUcSum/`, {
      body: JSON.stringify(coupleWellUc),
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      method: "POST",
      mode: "cors"
    });
  }

  changeCurvePath(newPath: any, index: number) {
    const { curvePaths, getWellCurve } = this.props;
    const newCurvePaths = JSON.parse(JSON.stringify(curvePaths));
    newCurvePaths[index] = newPath;
    getWellCurve(newCurvePaths);
  }

  getRecommended(index: number) {
    const {
      curvePaths,
      allTrackVertex,
      wellAttrData,
      getTopRecords,
      getRecVertex,
      getSameFlag,
      weightList
    } = this.props;
    const recommendedVertex = getRecommendedVertex(
      allTrackVertex,
      curvePaths,
      index
    );
    const allRecords = getRecommendedVertexByAttrDiffRecords(
      allTrackVertex,
      curvePaths,
      index,
      wellAttrData,
      weightList
    );
    const topRecords = getTop10RecomendedVertex(allRecords);
    const sameLayerFlags = IfLeftRightOnSameLayer(topRecords, allTrackVertex);
    getSameFlag(sameLayerFlags);
    getTopRecords(topRecords);
    getRecVertex(allRecords[0].vertex);
  }
  render() {
    const {
      width,
      height,
      curvePaths,
      paths,
      allTrack,
      paddingRatio,
      ucPath,
      wellAttrData,
      scale,
      allDiff,
      getCurIndex,
      curSelectedIndex,
      recVertex
    } = this.props;
    const { colorScale, pathGen } = this.state;
    let curves = null;
    if (curvePaths) {
      curves = curvePaths.map((e: any, i: number) => {
        return (
          <MatchCurve
            key={e.toString()}
            path={e}
            index={i}
            changeCurvePath={this.changeCurvePath}
            curSelectedIndex={curSelectedIndex}
            getCurIndex={getCurIndex}
            getRecommended={this.getRecommended}
            recommendedVertex={recVertex}
          />
        );
      });
    }

    let positivePaths = null;
    let negativePaths = null;
    if (paths) {
      positivePaths = paths[0].map((e: any, i: number) => {
        let pathD = pathGen(e);
        return <path key={i} d={pathD} className="trace-positive-path" />;
      });
      negativePaths = paths[1].map((e: any, i: number) => {
        let pathD = pathGen(e);
        return <path key={i} d={pathD} className="trace-negative-path" />;
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
          //TODO:fix bug:highestY on negative path is not accurate
          return d.mid;
        });
      trackPath = allTrack.map((track: any, i: number) => {
        let d: any = pathGene(track);
        return <path key={i} d={d} className="track-path" />;
      });
    }

    let ucPathOnSvg = null;
    if (ucPath.length > 0) {
      //TODO:FIX BUG:Do not loop every time render triggers
      ucPath[0].push(ucPath[0][0]); //loop
      ucPath[1].push(ucPath[1][0]); //loop
      const path = d3.path();
      let pathGene = d3
        .line()
        .x((d: any) => {
          return d[0];
        })
        .y((d: any) => {
          return d[1];
        })
        .curve(d3.curveMonotoneY);
      ucPathOnSvg = ucPath.map((e, i) => {
        let style = {
          fill: `url(#MyGradient-${i})`,
          stroke: `url(#MyGradient-${i})`,
          strokeWidth: 0.5
        };
        return (
          <React.Fragment key={i}>
            <defs key={v4()}>
              <linearGradient
                id={`MyGradient-${i}`}
                x1={i === 0 ? `100%` : `0%`}
                x2={i === 0 ? `0%` : `100%`}
                y1={`100%`}
                y2={`100%`}
              >
                <stop offset="0%" stopColor="yellow" />
                <stop offset="100%" stopColor="red" />
              </linearGradient>
            </defs>
            <path key={i} d={pathGene(e) as any} style={style} />
          </React.Fragment>
        );
      });
    }
    let wellAttrCurve = null;
    if (wellAttrData) {
      wellAttrCurve = wellAttrData.map((e, i) => {
        const pad = (width * (paddingRatio - 0.1)) / 5;
        const xStart = i === 0 ? pad / 2 + 25 : width - pad / 2 - 25;
        return (
          <WellAttr
            key={e.id}
            xStart={xStart}
            id={e.id}
            values={e.value}
            yScale={scale}
            svgWidth={width}
            leftFlag={i === 0 ? true : false}
            paddingRatio={paddingRatio}
          />
        );
      });
    }
    let divClassName = "well-match-div panel panel-primary";
    if (this.props.focusFlag === true) {
      divClassName += ` focus-well-match-div`;
    }
    return (
      <div className={divClassName}>
        <WithButtonViewHeading
          height={22}
          title={"Horizon View"}
          changeFocus={this.props.changeFocus}
        />
        <svg className="well-match-svg">
          {positivePaths}
          {negativePaths}
          {trackPath}
          {curves}
          {ucPathOnSvg}
          {wellAttrCurve}
        </svg>
        <Legend />
      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WellMatch);
