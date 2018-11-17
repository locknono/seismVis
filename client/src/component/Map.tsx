import * as React from "react";
import * as L from "leaflet";
import { connect } from "react-redux";
import {
  getAllWells,
  getCoupleWell,
  getCoupleWellLayer
} from "../action/changeWell";
import { getFigURI } from "../action/changeWell";

const mapStateToProps = (state: any, ownProps?: any) => {
  const scaler = state.figReducer.scaler;
  const { allWells, coupleWell, coupleWellLayer } = state.wellReducer;
  const { xStart, yStart, xEnd, yEnd, xySection } = state.globalVarReducer;
  return {
    scaler,
    allWells,
    coupleWell,
    coupleWellLayer,
    xStart,
    yStart,
    xEnd,
    yEnd,
    xySection
  };
};

const mapDispathToProps = {
  getAllWells,
  getCoupleWell,
  getCoupleWellLayer,
  getFigURI
};

interface Props {
  scaler: any;
  allWells: any;
  coupleWell: any;
  coupleWellLayer: any;
  readonly xStart: number;
  readonly yStart: number;
  readonly xEnd: number;
  readonly yEnd: number;
  readonly xySection: number;
  getAllWells: any;
  getCoupleWell: any;
  getCoupleWellLayer: any;
  getFigURI: any;
}

interface Map {
  map: any;
  mapRef: any;
  UNSAFE_internalCoupleIDStore: any;
  UNSAFE_internalCoupleLayerStore: any;
  UNSAFE_internalCoupleXYStore: any;
}

class Map extends React.Component<Props, object> {
  constructor(props: Props) {
    super(props);
    this.mapRef = React.createRef();
    this.UNSAFE_internalCoupleIDStore = [];
    this.UNSAFE_internalCoupleLayerStore = [];
    this.UNSAFE_internalCoupleXYStore = [];
    this.getPointsOnLine = this.getPointsOnLine.bind(this);
  }
  componentDidMount() {
    this.deployMap();
    this.generateBound();
  }

  componentDidUpdate(prevProps: Props, prevState: Props, snapshot: any) {
    let self = this;

    if (prevProps.scaler === null) {
      const { scaler, getAllWells, getCoupleWell, getFigURI } = this.props;
      const circlesLayer = L.layerGroup();
      fetch("./data/wellFullLocation.json")
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          return undefined;
        })
        .then(wellLocationData => {
          const allWells: any[] = [];
          wellLocationData.map((well: any) => {
            let xOnSvg = scaler.xScaler(well.x);
            let yOnSvg = scaler.yScaler(well.y);
            allWells.push({ ...well, xOnSvg, yOnSvg });
            let circle = L.circle(well.latlng, { radius: 10 }).on(
              "click",
              function() {
                self.UNSAFE_internalCoupleIDStore.push(well.id);
                self.UNSAFE_internalCoupleXYStore.push([well.x, well.y]);
                getCoupleWell(self.UNSAFE_internalCoupleIDStore);
                if (self.UNSAFE_internalCoupleIDStore.length === 2) {
                  self.UNSAFE_internalCoupleIDStore = [];

                  const pointsOnLine = self.getPointsOnLine(
                    self.UNSAFE_internalCoupleXYStore
                  );
                  const figURI = self
                    .fetchMatchFig(pointsOnLine)
                    .then(figURI => {
                      getFigURI(figURI);
                    });
                  console.log("figURI: ", figURI);
                  getFigURI(figURI);
                  self.UNSAFE_internalCoupleXYStore = [];
                }
              }
            );
            circlesLayer.addLayer(circle);
          });
          getAllWells(allWells);
        });
      circlesLayer.addTo(this.map);
    }

    if (this.props.coupleWell.length !== prevProps.coupleWell.length) {
      const {
        coupleWell,
        allWells,
        coupleWellLayer,
        getCoupleWellLayer
      } = this.props;
      if (coupleWellLayer.length === 2) {
        coupleWellLayer[0].remove();
        coupleWellLayer[1].remove();
      }
      for (let i = 0; i < allWells.length; i++) {
        if (coupleWell[coupleWell.length - 1] === allWells[i].id) {
          let circle = L.circle(allWells[i].latlng, {
            radius: 10,
            color: "red"
          });
          circle.addTo(this.map);
          self.UNSAFE_internalCoupleLayerStore.push(circle);
          getCoupleWellLayer(self.UNSAFE_internalCoupleLayerStore);
          if (self.UNSAFE_internalCoupleLayerStore.length === 2) {
            self.UNSAFE_internalCoupleLayerStore = [];
          }
          break;
        }
      }
    }
  }

  getPointsOnLine(line: any) {
    const { xStart, yStart, xySection } = this.props;
    let x1 = (line[0][0] - xStart) / xySection;
    let y1 = (line[0][1] - yStart) / xySection;
    let x2 = (line[1][0] - xStart) / xySection;
    let y2 = (line[1][1] - yStart) / xySection;
    const matrixCoors = [[x1, y1], [x2, y2]].map(e => e.map(Math.floor));
    const k =
      (matrixCoors[0][1] - matrixCoors[1][1]) /
      (matrixCoors[0][0] - matrixCoors[1][0]);
    const b = matrixCoors[0][1] - matrixCoors[0][0] * k;
    let smallerX = matrixCoors[0][0] < matrixCoors[1][0] ? 0 : 1;
    let biggerX = matrixCoors[0][0] < matrixCoors[1][0] ? 1 : 0;
    let pointsOnLine = [];
    for (let x = matrixCoors[smallerX][0]; x < matrixCoors[biggerX][0]; x++) {
      let y = Math.floor(k * x + b);
      pointsOnLine.push([x, y]);
    }
    return pointsOnLine;
  }

  fetchMatchFig(pointsOnLine: any) {
    return fetch("http://localhost:5000/drawLine/", {
      body: JSON.stringify(pointsOnLine), // must match 'Content-Type' header
      credentials: "same-origin", // include, same-origin, *omit
      headers: {
        "content-type": "application/json"
      },
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors" // no-cors, cors, *same-origin
    }).then(res => res.text());
  }

  deployMap() {
    const center: [number, number] = [37.867271959429445, 118.78092767561518];
    const zoom = 13;
    const preferCanvas = true;
    const zoomControl = false;
    const attributionControl = false;
    const options: any = {
      center,
      zoom,
      zoomControl,
      attributionControl,
      preferCanvas
    };
    this.map = L.map(this.mapRef.current.id, options);
    L.tileLayer(`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).addTo(
      this.map
    );
  }

  generateBound() {
    //clockwise from left-bottom
    let p1: [number, number] = [37.83164815261103, 118.73221307817226];
    let p2: [number, number] = [37.90098826849878, 118.73383750454309];
    let p3: [number, number] = [37.899613830166174, 118.82475161382335];
    let p4: [number, number] = [37.83027712360192, 118.82304212267306];
    let bound = [p1, p2, p3, p4];

    L.circle(p1, { radius: 100, color: "red" }).addTo(this.map);
    L.circle(p3, { radius: 100, color: "black" }).addTo(this.map);

    L.polygon(bound, { color: "blue" }).addTo(this.map);
  }

  generateGrid() {
    //TO-DO
  }

  render() {
    return (
      <React.Fragment>
        <div
          id="map"
          ref={this.mapRef}
          className="leaflet-map panel panel-default"
        />
      </React.Fragment>
    );
  }
}
export default connect(
  mapStateToProps,
  mapDispathToProps
)(Map);