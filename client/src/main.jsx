import { IconContext } from "@phosphor-icons/react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./store/store";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <IconContext.Provider value={{ size: 21, "aria-hidden": true }}>
        <App />
      </IconContext.Provider>
    </BrowserRouter>
  </Provider>,
);
