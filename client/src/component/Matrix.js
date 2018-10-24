import React, { Component } from "react";
import PlaneChooseButton from "./PlaneChooseButton";
import MatrixFigure from "./MatrixFigure";
import MatrixControlPanel from "./MatrixControlPanel";
import PolylineSvg from "./PolylineSvg";
import MatrixSelectedLine from "./MatrixSelectedLine";
class Matrix extends Component {
  constructor(props) {
    super(props);
    this.state = { plane: "xy", depth: 0, maxDepth: 2902, zData: [] };
    this.onSlide = this.onSlide.bind(this);
    this.onAutoShow = this.onAutoShow.bind(this);
    this.stopAutoShow = this.stopAutoShow.bind(this);
    this.onChangePlane = this.onChangePlane.bind(this);
    this.onClickChangeZData = this.onClickChangeZData.bind(this);
    this.onChangeImgURI = this.onChangeImgURI.bind(this);
  }
  onSlide(value) {
    let plane = this.state.plane;
    this.setState({ depth: value, plane: plane });
  }
  onAutoShow() {
    let curDepth = this.state.depth;
    let plane = this.state.plane;
    let interval = setInterval(
      function() {
        this.setState({ depth: curDepth });
        curDepth += 1;
      }.bind(this),
      35
    );
    this.setState({ interval: interval, plane: plane });
  }
  stopAutoShow() {
    clearInterval(this.state.interval);
  }
  onChangePlane(plane) {
    let maxDepth = null;
    switch (plane) {
      case "xy":
        maxDepth = 2902;
        break;
      case "xz":
        maxDepth = 716;
        break;
      case "yz":
        maxDepth = 886;
        break;
      default:
        maxDepth = 2902;
        break;
    }
    this.setState({ plane: plane, depth: 0, maxDepth: maxDepth });
    this.stopAutoShow();
  }
  onClickChangeZData(zData) {
    this.setState({ zData });
  }
  onChangeImgURI(imgURI) {
    this.setState({ imgURI });
  }
  render() {
    const { plane, depth, maxDepth, zData, imgURI } = this.state;
    const PlaneChooseButtonS = ["xy", "xz", "yz"].map(plane => (
      <PlaneChooseButton
        key={plane}
        plane={plane}
        onChangePlane={this.onChangePlane}
      />
    ));
    return (
      <div className="matrix panel panel-default">
        <MatrixFigure
          plane={plane}
          depth={depth}
          onClickChangeZData={this.onClickChangeZData}
          onChangeImgURI={this.onChangeImgURI}
        />
        <MatrixControlPanel
          onSlide={this.onSlide}
          onAutoShow={this.onAutoShow}
          stopAutoShow={this.stopAutoShow}
          plane={plane}
          depth={depth}
          maxDepth={maxDepth}
          PlaneChooseButtonS={PlaneChooseButtonS}
        />
        <PolylineSvg zData={zData} width={1000} height={200} />
        <MatrixSelectedLine imgURI={imgURI} />
      </div>
    );
  }
}

export default Matrix;
