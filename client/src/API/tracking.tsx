interface Peak {
  top: number;
  bottom: number;
  mid: number;
  highestX: number;
  highestY: number;
  value: number;
}

type Track = Peak[];

type AllTracks = Track[];

export default class Tracker {
  constructor() {}
  clearSawtooth(
    path: [number, number][],
    x: number,
    ifPositive: boolean
  ): [number, number][] {
    const deleteIndicesSet = new Set();
    if (ifPositive) {
      for (let i = 1; i < path.length - 2; i += 2) {
        if (path[i][0] > x && path[i + 2][0] > x) {
          deleteIndicesSet.add(i + 1);
        }
      }
    } else {
      for (let i = 1; i < path.length - 2; i += 2) {
        if (path[i][0] < x && path[i + 2][0] < x) {
          deleteIndicesSet.add(i + 1);
        }
      }
    }
    const deleteIndicesList = Array.from(deleteIndicesSet).reverse();
    for (let i = 0; i < deleteIndicesList.length; i++) {
      path.splice(deleteIndicesList[i], 1);
    }
    return path;
  }

  extractPeaks(positivePath: [number, number][], x: number) {
    console.log("x: ", x);
    console.log("positivePath: ", positivePath);
    const peaks = [];
    let peakPoints = [];
    let findFlag = false;
    for (let i = 0; i < positivePath.length - 1; i++) {
      let point = positivePath[i];
      let nextPoint = positivePath[i + 1];
      if (point[0] === x && nextPoint[0] !== x) findFlag = true;
      if (point[0] !== x && nextPoint[0] === x) {
        peakPoints.push(nextPoint);
        findFlag = false;
      }
      if (findFlag === true) {
        peakPoints.push(point);
      } else if (findFlag === false && peakPoints.length > 0) {
        let peakInfo = {
          highestX: -1,
          highestY: -1,
          value: 0
        };
        peakPoints.map(e => {
          if (Math.abs(e[0] - x) > peakInfo.value) {
            peakInfo.highestX = e[0];
            peakInfo.highestY = e[1];
            peakInfo.value = e[0] - x;
          }
        });
        let peak = {
          highestX: peakInfo.highestX,
          highestY: peakInfo.highestY,
          value: Math.abs(peakInfo.value),
          positiveFlag: peakInfo.value > 0 ? true : false,
          top: peakPoints[0][1],
          bottom: peakPoints[peakPoints.length - 1][1],
          mid: (peakPoints[0][1] + peakPoints[peakPoints.length - 1][1]) / 2
        };
        peaks.push(peak);
        peakPoints = [];
      }
    }
    return peaks;
  }

  tracking(allPeaks: any, startTrackNumber: number) {
    const allTracks = [];
    for (let i = 0; i < allPeaks[startTrackNumber].length; i++) {
      const track = [allPeaks[startTrackNumber][i]];
      for (let j = startTrackNumber + 1; j < allPeaks.length; j++) {
        let nextPeak = null;
        let MinOffset = 999;
        const lastPeakOnTrack = track[track.length - 1];
        for (let s = 0; s < allPeaks[j].length; s++) {
          if (allPeaks[j][s].positiveFlag !== lastPeakOnTrack.positiveFlag)
            continue;
          let offset = Math.abs(
            allPeaks[j][s].highestY - lastPeakOnTrack.highestY
          );
          if (offset < MinOffset) {
            MinOffset = offset;
            nextPeak = allPeaks[j][s];
          }
        }
        //if offsets too much,stop here
        if (MinOffset > 50) break;
        track.push(nextPeak);
      }
      allTracks.push(track);
    }
    cutoff(allTracks);
    return allTracks;

    function cutoff(allTracks: any[]) {
      for (let i = 0; i < allTracks.length - 1; i++) {
        for (let j = 0; j < allTracks[i].length; j++) {
          if (!allTracks[i + 1][j]) continue;
          let curTrack = allTracks[i];
          let nextTrack = allTracks[i + 1];
          if (curTrack[j].highestY !== nextTrack[j].highestY) continue;
          let curOffSet = Math.abs(
            curTrack[j].highestY - curTrack[j - 1].highestY
          );
          let nextOffSet = Math.abs(
            nextTrack[j].highestY - nextTrack[j - 1].highestY
          );
          let curValueDiff = Math.abs(
            curTrack[j].value - curTrack[j - 1].value
          );
          let nextValueDiff = Math.abs(
            nextTrack[j].value - nextTrack[j - 1].value
          );
          let curDiff = 0.5 * curOffSet + 0.5 * curValueDiff;
          let nextDiff = 0.5 * nextOffSet + 0.5 * nextValueDiff;
          if (curDiff < nextDiff) {
            allTracks[i + 1].splice(j, allTracks[i + 1].length - j);
          } else {
            allTracks[i].splice(j, allTracks[i].length - j);
          }
        }
      }
    }
  }

  cutOffAllTracks(allTracks: any, traceCount: number) {
    for (let i = allTracks.length - 1; i >= 0; i--) {
      if (allTracks[i].length < traceCount / 2) {
        allTracks.splice(i, 1);
      }
    }
    let removeSet = new Set();
    for (let i = 0; i < allTracks.length; i++) {
      labelStop: for (let j = 0; j < allTracks.length; j++) {
        if (i === j) continue;
        let track1 = allTracks[i];
        let track2 = allTracks[j];
        if (track1.length === track2.length) continue;
        for (let s = 1; s < track1.length; s++) {
          for (let m = 1; m < track2.length; m++) {
            if (
              track1[s].highestY === track2[m].highestY &&
              track1[s].x === track2[m].x &&
              track1[s - 1].highestY !== track2[m - 1].highestY
            ) {
              if (track1.length < track2.length) {
                removeSet.add(i);
                break labelStop;
              } else {
                removeSet.add(j);
                break labelStop;
              }
            }
          }
        }
      }
    }
    let removeList = Array.from(removeSet).sort((a, b) => b - a);
    for (let i = 0; i < removeList.length; i++) {
      allTracks.splice(removeList[i], 1);
    }

    this.RemoveOverlapTrackingPath(allTracks);
  }

  RemoveOverlapTrackingPath(allTracks: AllTracks) {
    const removeSet = new Set();
    for (let i = 0; i < allTracks.length; i++) {
      for (let j = i + 1; j < allTracks.length; j++) {
        if (i === j) continue;
        if (this.ifTrackOverlap(allTracks[i], allTracks[j])) {
          removeSet.add(allTracks[i].length > allTracks[j].length ? j : i);
        }
      }
    }
    const removeList = Array.from(removeSet).sort((a, b) => b - a);
    for (let i = 0; i < removeList.length; i++) {
      allTracks.splice(removeList[i], 1);
    }
    console.log("allTracks: ", allTracks);
    console.log("removeList: ", removeList);
  }
  ifPeakEqual(peak1: Peak, peak2: Peak): boolean {
    return (
      peak1.highestX === peak2.highestX &&
      peak1.highestY === peak2.highestY &&
      peak1.value === peak2.value
    );
  }

  ifTrackOverlap(track1: Track, track2: Track): boolean {
    if (track1.length === track2.length) return false;
    let overlap = false;
    let [longTrack, shortTrack] =
      track1.length > track2.length ? [track1, track2] : [track2, track1];
    for (let i = 0, j = 0; i < longTrack.length && j < shortTrack.length; ) {
      if (this.ifPeakEqual(longTrack[i], shortTrack[j])) {
        i += 1;
        j += 1;
      } else {
        i += 1;
        j = 0;
      }
      if (j === shortTrack.length) {
        overlap = true;
      }
    }
    return overlap;
  }

  getFourVertex(track: Track) {
    return [
      track[0].top,
      track[0].bottom,
      track[track.length - 1].top,
      track[track.length - 1].bottom
    ];
  }
}
