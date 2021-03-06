import {
  VertexType,
  MatchCurvePath,
  AllMatchCurve,
  AllVertices,
  WellAttrData,
  AllRecords
} from "../ts/Type";
import MatchCurve from "src/component/MatchCurve";
import { compareInOneLayer } from "../API/wellAttrDiff";
import {
  reverseScale,
  initialWellMatchDepthScale
} from "../reducer/globalVarReducer";
import * as d3 from "d3";
export function extractPathVertex(e: MatchCurvePath): VertexType {
  return [
    e[0],
    e[e.length - 2],
    e[Math.floor(e.length / 2) - 1],
    e[Math.floor(e.length / 2)]
  ];
}

export function extractMatchVertex(curvePaths: AllMatchCurve): AllVertices {
  const matchVertex: AllVertices = [];
  curvePaths.map(e => {
    matchVertex.push(extractPathVertex(e));
  });
  return matchVertex;
}

export default class Uncertainty {
  constructor() {}

  cal(
    trackVertex: AllVertices,
    curvePaths: AllMatchCurve,
    width: number,
    paddingRatio: number,
    height: number
  ) {
    const matchVertex = extractMatchVertex(curvePaths);
    const trackDepthList = getTrackDepthList(trackVertex);
    let ucList: number[] = [];

    const leftMaps = [];
    const rightMaps = [];
    for (let i = 0; i < matchVertex.length; i++) {
      const curMatch = matchVertex[i];
      leftMaps.push(getMatchVertexPosition(curMatch, trackVertex, 0, 1));

      rightMaps.push(getMatchVertexPosition(curMatch, trackVertex, 2, 3));
    }

    for (let i = 0; i < leftMaps.length; i++) {
      const leftMap = leftMaps[i];
      const rightMap = rightMaps[i];
      let curMatchUC = 0;
      convertMapValueFromDepthToPortion(leftMap);

      convertMapValueFromDepthToPortion(rightMap);

      let time = 0;
      while (notFinish(leftMap) && time < 10) {
        loop: for (let [k1, v1] of leftMap) {
          if (v1 === 0) continue;
          for (let [k2, v2] of rightMap) {
            if (v2 === 0) {
              continue;
            } else {
              if (v1 > v2) {
                curMatchUC += v2 * Math.abs(k1 - k2);
                rightMap.set(k2, 0);
                leftMap.set(k1, v1 - v2);
                break loop;
              } else {
                curMatchUC += v1 * Math.abs(k1 - k2);
                rightMap.set(k2, v2 - v1);
                leftMap.set(k1, 0);
                break loop;
              }
            }
          }
        }
        time += 1;
      }
      /* const allKey = findAllKey(leftMap, rightMap);
      for (let key of allKey) {
        let leftValue = leftMap.get(key);
        let rightValue = rightMap.get(key);
        if (leftValue && rightValue) {
          curMatchUC += Math.abs(leftValue - rightValue);
        } else if (leftValue && !rightValue) {
          curMatchUC += leftValue;
        } else if (rightValue && !leftValue) {
          curMatchUC += rightValue;
        }
      } */
      ucList.push(curMatchUC);
    }

    return {
      path: this.getUcPath(matchVertex, ucList, width, paddingRatio, height),
      ucList
    };

    function notFinish(map: Map<number, number>) {
      for (let [k, v] of map) {
        if (v !== 0) return true;
      }
      return false;
    }
  }

  getUcPath(
    matchVertex: [number, number][][],
    ucList: number[],
    width: number,
    paddingRatio: number,
    height: number
  ) {
    const pad = width / 20;
    const xStart = matchVertex[0][0][0];
    const xEnd = matchVertex[0][2][0];

    const pathRightStartX = xEnd + pad;
    const padLeftStartX = xStart - pad;

    const rightPath = this.getOneSideUcPath(
      matchVertex,
      ucList,
      pathRightStartX,
      height,
      paddingRatio,
      false
    );
    const leftPath = this.getOneSideUcPath(
      matchVertex,
      ucList,
      padLeftStartX,
      height,
      paddingRatio,
      true
    );
    return [leftPath, rightPath];
  }

  getUcSum(ucList: number[]) {
    const reducer = (accumulator: number, currentValue: number) =>
      accumulator + currentValue;
    return ucList.reduce(reducer);
  }

  getOneSideUcPath(
    matchVertex: any,
    ucList: number[],
    startX: number,
    height: number,
    paddingRatio: number,
    left: boolean
  ) {
    const ucPath = [];
    const exp = 40;
    const scale = d3
      .scaleLinear()
      .domain([0, 4])
      .range([0, 70])
      .clamp(true);
    for (let i = 0; i < matchVertex.length; i++) {
      const value = ucList[i];
      const track = matchVertex[i];
      if (left === false) {
        const topPoint = [startX, track[2][1]];
        const midPoint = [
          startX + scale(value),
          (track[2][1] + track[3][1]) / 2
        ];
        const bottomPoint = [startX, track[3][1]];
        const path = [topPoint, midPoint, bottomPoint];
        ucPath.push(path);
      } else {
        const topPoint = [startX, track[0][1]];
        const midPoint = [
          startX - scale(value),
          (track[0][1] + track[1][1]) / 2
        ];
        const bottomPoint = [startX, track[1][1]];
        const path = [topPoint, midPoint, bottomPoint];
        ucPath.push(path);
      }
    }

    ucPath.sort((a: any, b: any) => {
      return a[0][1] - b[0][1];
    });
    const drawPath = [[startX, height * 0.05]];
    for (let i = 0; i < ucPath.length; i++) {
      drawPath.push(ucPath[i][0]);
      drawPath.push(ucPath[i][1]);
      drawPath.push(ucPath[i][2]);
    }
    //do not loop and use d3.curveCardinalOpen
    //drawPath.push([startX, height * (1 - 0.05)]);
    return drawPath;
  }

  autoAjustMatchCurve() {}
}

export function getMatchVertexPosition(
  matchVertex: VertexType,
  trackVertex: AllVertices,
  t1: number,
  t2: number
) {
  let startIndex = 0;
  let endIndex = 0;
  let startDepth = 0;
  let endDepth = 0;
  for (let j = 0; j < trackVertex.length; j++) {
    if (
      matchVertex[t1][1] > trackVertex[j][t1][1] &&
      matchVertex[t1][1] < trackVertex[j][t2][1]
    ) {
      startIndex = j;
      startDepth = trackVertex[j][t2][1] - matchVertex[t1][1];
    }
    if (
      matchVertex[t2][1] > trackVertex[j][t1][1] &&
      matchVertex[t2][1] < trackVertex[j][t2][1]
    ) {
      endIndex = j;
      endDepth = matchVertex[t2][1] - trackVertex[j][t1][1];
    }
    if (startIndex === 0 || endIndex === 0) {
      if (
        matchVertex[t1][1] > trackVertex[j][t2][1] &&
        matchVertex[t1][1] < trackVertex[j + 1][t1][1]
      ) {
        startIndex = j;
        endIndex = j;
        startDepth = matchVertex[t1][1] - trackVertex[j][t2][1];
        endDepth = matchVertex[t1][1] - trackVertex[j][t2][1];
      }
    }
  }
  const map: Map<number, number> = new Map();

  if (startIndex === endIndex) {
    map.set(startIndex, startDepth); //no matter what depth is,portion==1
  } else if (endIndex === startIndex + 1) {
    map.set(startIndex, startDepth);
    map.set(endIndex, endDepth);
  } else {
    map.set(startIndex, startDepth);
    for (let s = startIndex + 1; s <= endIndex - 1 - 1; s++) {
      map.set(s, trackVertex[s][t2][1] - trackVertex[s][t1][1]);
    }
    map.set(endIndex, endDepth);
  }
  return map;
}

export function getTrackDepthList(trackVertex: AllVertices) {
  const depthList = trackVertex.map(e => {
    return [e[1][1] - e[0][1], e[2][1] - e[1][1]];
  });
  return depthList as [number, number][];
}

export function convertMapValueFromDepthToPortion(map: Map<number, number>) {
  let valueSum = 0;
  for (let [key, value] of map) {
    valueSum += value;
  }
  for (let [key, value] of map) {
    map.set(key, value / valueSum);
  }
}

export function AddLayerKeyWithValueZero(
  map: Map<number, number>,
  trackCount: number
) {
  for (let i = 0; i < trackCount; i++) {
    if (!map.get(i)) {
      map.set(i, 0);
    }
  }
}

export function findAllKey(m1: Map<number, number>, m2: Map<number, number>) {
  const set = new Set();
  for (let [k, v] of m1) {
    set.add(k);
  }
  for (let [k, v] of m2) {
    set.add(k);
  }
  return Array.from(set);
}

export function getRecommendedVertex(
  trackVertex: AllVertices,
  curvePaths: AllMatchCurve,
  index: number
) {
  const matchVertex = extractMatchVertex(curvePaths);
  const trackDepthList = getTrackDepthList(trackVertex);
  let ucList: number[] = [];
  const leftMaps = [];
  const rightMaps = [];
  for (let i = 0; i < matchVertex.length; i++) {
    const curMatch = matchVertex[i];
    leftMaps.push(getMatchVertexPosition(curMatch, trackVertex, 0, 1));
    rightMaps.push(getMatchVertexPosition(curMatch, trackVertex, 2, 3));
  }
  const curLeftMap = leftMaps[index];
  const curRightMap = rightMaps[index];
  const changedMap = new Map();
  let path: MatchCurvePath = [];
  if (curLeftMap.size === 1 && curRightMap.size > 1) {
    for (let [key, value] of curLeftMap) {
      path.push(matchVertex[index][0]);
      path.push(matchVertex[index][1]);
      path.push(trackVertex[key][2]);
      path.push(trackVertex[key][3]);
    }
  } else if (curRightMap.size === 1 && curLeftMap.size > 1) {
    for (let [key, value] of curRightMap) {
      path.push(trackVertex[key][0]);
      path.push(trackVertex[key][1]);
      path.push(matchVertex[index][2]);
      path.push(matchVertex[index][3]);
    }
  } else if (curLeftMap.size === 1 && curRightMap.size === 1) {
    let [leftKey] = [...curLeftMap.keys()];
    let [rightKey] = [...curRightMap.keys()];
    if (leftKey !== rightKey) {
      const leftValue = curLeftMap.get(leftKey);
      const rightValue = curLeftMap.get(rightKey);
      if ((leftValue as number) < (rightValue as number)) {
        path.push(matchVertex[index][0]);
        path.push(matchVertex[index][1]);
        path.push(trackVertex[leftKey][2]);
        path.push(trackVertex[leftKey][3]);
      } else {
        path.push(trackVertex[rightKey][0]);
        path.push(trackVertex[rightKey][1]);
        path.push(matchVertex[index][2]);
        path.push(matchVertex[index][3]);
      }
    }
  } else {
  }
  if (path.length === 0) {
    return undefined;
  }
  return path as VertexType;
}

export function getRecommendedVertexByAttrDiffRecords(
  trackVertex: AllVertices,
  curvePaths: AllMatchCurve,
  index: number,
  wellAttrData: WellAttrData,
  weightList: number[]
): AllRecords {
  const xStart = curvePaths[index][0][0];
  const xEnd = curvePaths[index][2][0];
  const matchVertex = extractMatchVertex(curvePaths);
  const [well1, well2] = wellAttrData;
  const depthList = getDepthListBwtweenTwoTrack(index, matchVertex) as [
    number,
    number,
    number,
    number
  ];
  const records = [];
  const windowDepth = generateWindow(depthList, matchVertex, index);
  for (let window of windowDepth) {
    const diff = compareInOneLayer(
      window as [number, number, number, number],
      well1,
      well2,
      weightList
    );
    const diffSum = diff.reduce((prev, cur) => prev + cur);
    const vertex = getVertexWithWindowDepthList(xStart, xEnd, window);
    const record = { diffSum, diff, vertex, matchVertex: matchVertex[index] };
    records.push(record);
  }
  records.sort((a, b) => a.diffSum - b.diffSum);
  return records;
}

export function getRecommendedVertexByAttrDiff(
  trackVertex: AllVertices,
  curvePaths: AllMatchCurve,
  index: number,
  wellAttrData: WellAttrData,
  weightList: number[]
): VertexType {
  const records = getRecommendedVertexByAttrDiffRecords(
    trackVertex,
    curvePaths,
    index,
    wellAttrData,
    weightList
  );
  return records[0].vertex;
}

export function getDepthListBwtweenTwoTrack(
  index: number,
  matchVertex: AllVertices
) {
  const leftDepthScope = [
    matchVertex[index - 1] !== undefined
      ? matchVertex[index - 1][1][1]
      : matchVertex[index][0][1] - 20,
    matchVertex[index + 1] !== undefined
      ? matchVertex[index + 1][0][1]
      : matchVertex[index][1][1] + 20
  ];
  const rightDepthScope = [
    matchVertex[index - 1] !== undefined
      ? matchVertex[index - 1][3][1]
      : matchVertex[index][2][1] - 20,
    matchVertex[index + 1] !== undefined
      ? matchVertex[index + 1][2][1]
      : matchVertex[index][3][1] + 20
  ];
  const depthList = [];
  for (let depth of leftDepthScope) {
    depthList.push(reverseScale(depth));
  }
  for (let depth of rightDepthScope) {
    depthList.push(reverseScale(depth));
  }
  return depthList;
}

export function generateWindow(
  depthList: [number, number, number, number],
  matchVertex: AllVertices,
  index: number
) {
  const leftDepth = depthList[1] - depthList[0];
  const rightDepth = depthList[3] - depthList[2];
  const windowDepth = [];
  const leftHeight =
    reverseScale(matchVertex[index][1][1]) -
    reverseScale(matchVertex[index][0][1]);
  const rightHeight =
    reverseScale(matchVertex[index][3][1]) -
    reverseScale(matchVertex[index][2][1]);
  //fix left side
  for (let stepCount = 10; stepCount >= 0.5; stepCount -= 0.5) {
    const rightStep = rightDepth / stepCount;
    if (rightStep > 2 * leftHeight || rightStep < leftHeight / 2) {
      continue;
    }
    for (let i = 0; i < stepCount; i++) {
      windowDepth.push([
        reverseScale(matchVertex[index][0][1]),
        reverseScale(matchVertex[index][1][1]),
        depthList[2] + rightStep * i,
        depthList[2] + rightStep * (i + 1)
      ]);
    }
  }
  for (let stepCount = 10; stepCount >= 0.5; stepCount -= 0.2) {
    const leftStep = leftDepth / stepCount;
    if (leftStep > 2 * rightHeight || leftStep < rightHeight / 2) {
      continue;
    }
    for (let i = 0; i < stepCount; i++) {
      windowDepth.push([
        depthList[0] + leftStep * i,
        depthList[0] + leftStep * (i + 1),
        reverseScale(matchVertex[index][2][1]),
        reverseScale(matchVertex[index][3][1])
      ]);
    }
  }

  return windowDepth;
}

export function getVertexWithWindowDepthList(
  xStart: number,
  xEnd: number,
  windowDepth: number[]
) {
  const vertex: VertexType = [
    [xStart, initialWellMatchDepthScale(windowDepth[0])],
    [xStart, initialWellMatchDepthScale(windowDepth[1])],
    [xEnd, initialWellMatchDepthScale(windowDepth[2])],
    [xEnd, initialWellMatchDepthScale(windowDepth[3])]
  ];
  return vertex;
}

export function IfLeftRightOnSameLayer(
  topRecords: AllRecords,
  trackVertex: AllVertices
) {
  const sameLayerFlags = [];
  for (let i = 0; i < topRecords.length; i++) {
    const tv = topRecords[i].vertex;
    const leftSet = new Set();
    const rightSet = new Set();
    for (let j = 0; j < trackVertex.length; j++) {
      if (tv[0][1] > trackVertex[j][0][1] && tv[0][1] < trackVertex[j][1][1]) {
        leftSet.add(j);
      }
      if (tv[1][1] > trackVertex[j][0][1] && tv[1][1] < trackVertex[j][1][1]) {
        leftSet.add(j);
      }
      if (tv[2][1] > trackVertex[j][2][1] && tv[2][1] < trackVertex[j][3][1]) {
        rightSet.add(j);
      }
      if (tv[3][1] > trackVertex[j][2][1] && tv[3][1] < trackVertex[j][3][1]) {
        rightSet.add(j);
      }
      if (
        tv[0][1] > trackVertex[j][1][1] &&
        tv[0][1] < trackVertex[j + 1][0][1]
      ) {
        leftSet.add(j + 0.5);
      }
      if (
        tv[1][1] > trackVertex[j][1][1] &&
        tv[1][1] < trackVertex[j + 1][0][1]
      ) {
        leftSet.add(j + 0.5);
      }
      if (
        tv[2][1] > trackVertex[j][3][1] &&
        tv[2][1] < trackVertex[j + 1][2][1]
      ) {
        rightSet.add(j + 0.5);
      }
      if (
        tv[3][1] > trackVertex[j][3][1] &&
        tv[3][1] < trackVertex[j + 1][2][1]
      ) {
        rightSet.add(j + 0.5);
      }
    }
    let sameLayerFlag = true;

    for (let l of leftSet.values()) {
      for (let r of rightSet.values()) {
        if (l !== r) sameLayerFlag = false;
        break;
      }
    }
    sameLayerFlags.push(sameLayerFlag);
  }
  return sameLayerFlags;
}
