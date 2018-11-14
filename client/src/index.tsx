import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import registerServiceWorker from "./registerServiceWorker";
import { Provider } from "react-redux";
import { createStore, combineReducers } from "redux";
import figReducer from "./reducer/figReducer";
import globalVarReducer from "./reducer/globalVarReducer";
import wellReducer from "./reducer/wellsReducer";

const rootReducer = combineReducers({
  figReducer,
  wellReducer,
  globalVarReducer
});

let store = createStore(rootReducer);

console.log(store.getState());
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root") as HTMLElement
);
registerServiceWorker();
