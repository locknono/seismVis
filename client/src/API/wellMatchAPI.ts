import Tracker from "../API/tracking";
import * as d3 from "d3";
import { MatrixData, AllTracks, AllVertices } from "../ts/Type";
export function getSize(matrixData: MatrixData) {
  /* return [70 * matrixData.length, matrixData[0].length * 4.8]; */
  return [700, matrixData[0].length * 4.8];
}

export function getWellMatchPath(
  wellIDNearLine: string[],
  paddingRatio: number,
  width: number,
  matrixData: MatrixData,
  wellIDNearLineIndex: number[],
  scale: any
) {
  return fetch(`./data/groupWellData.json`)
    .then(res => res.json())
    .then(groupWellData => {
      const data = [];
      for (let i = 0; i < wellIDNearLine.length; i++) {
        for (let j = 0; j < groupWellData.length; j++) {
          if (groupWellData[j]["id"] === wellIDNearLine[i]) {
            data.push(groupWellData[j]);
            break;
          }
        }
      }
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
            width * paddingRatio +
            wellIDNearLineIndex[j] * (matrixData.length - 1) * pad +
            pad / 2;
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
      return paths;
    });
}

export function api_getTracePath(
  width: number,
  matrixData: MatrixData,
  scale: any,
  paddingRatio: number,
  depthList: number[]
) {
  const trakcer = new Tracker();
  const drawWidth = width * (1 - 2 * paddingRatio);
  const pad = drawWidth / matrixData.length;
  //set xOffsetScope a litter bigger than `pad/2`
  //TODO: restrict the biggest xOffsetScope
  const xOffsetScope = pad / 0.8;
  const xScale = d3
    .scaleLinear()
    .domain([-13685.379, 13685.379])
    .range([-xOffsetScope, xOffsetScope]);
  const allPeaks = [];
  const positivePaths: [number, number][][] = [];
  const negativePaths: [number, number][][] = [];
  const paths = [];
  let trackXStart: number, trackXEnd: number;
  for (let i = 0; i < matrixData.length; i++) {
    let positivePath: [number, number][] = [];
    let negativePath: [number, number][] = [];
    const xStart = paddingRatio * width + pad * i + pad / 2;
    if (i === 0) trackXStart = xStart;
    if (i === matrixData.length - 1) trackXEnd = xStart;
    for (let j = 0; j < matrixData[i].length; j++) {
      const preXOffset =
        xScale(matrixData[i][j]) > pad / 2 ? pad / 2 : xScale(matrixData[i][j]);
      const xOffset = matrixData[i][j] === 0 ? 0 : preXOffset;
      const p1: [number, number] = [xStart, scale(depthList[j])];
      const p2: [number, number] = [
        xStart + xOffset,
        (scale(depthList[j]) + scale(depthList[j + 1])) / 2
      ];
      const p3: [number, number] = [
        xStart,
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

    positivePath = trakcer.clearSawtooth(positivePath, xStart, true);
    negativePath = trakcer.clearSawtooth(negativePath, xStart, false);

    const peaks = [
      ...trakcer.extractPeaks(positivePath, xStart),
      ...trakcer.extractPeaks(negativePath, xStart)
    ];
    allPeaks.push(peaks);
    //loop the positivePath to ensure it's closed so that css `fill` works
    positivePath.push([xStart, scale(depthList[matrixData[0].length + 1])]);
    positivePath.push([xStart, scale(depthList[0])]);
    negativePath.push([xStart, scale(depthList[matrixData[0].length + 1])]);

    positivePaths.push(positivePath);
    negativePaths.push(negativePath);
  }

  const allTrack: AllTracks = [];
  for (let i = 0; i < allPeaks.length / 2; i++) {
    allTrack.push(...trakcer.tracking(allPeaks, i));
  }

  trakcer.cutOffAllTracks(allTrack, allPeaks.length);

  allTrack.sort((a, b) => {
    return a[0].top - b[0].top;
  });

  const allTrackVertex: AllVertices = [];
  allTrack.map((e: any, i: number) => {
    allTrackVertex.push(trakcer.getFourVertex(trackXStart, trackXEnd, e));
  });

  paths.push(positivePaths, negativePaths);

  return {
    allTrackVertex,
    allTrack,
    paths
  };
}

export function ifMatchCurveEqual(cur: any, prev: any) {
  if (!prev && !!cur) {
    return false;
  } else if (prev.length !== cur.length) {
    return false;
  } else {
    for (let i = 0; i < cur.length; i++) {
      for (let s = 0; s < cur[i].length; s++) {
        if (cur[i][s][1] !== prev[i][s][1]) {
          return false;
        }
      }
    }
  }
  return true;
}
