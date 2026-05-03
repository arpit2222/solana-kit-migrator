import { createElement } from "react";
import { createRoot } from "react-dom/client";
import App from "../artifacts/solana-migrator/src/App";
import "../artifacts/solana-migrator/src/index.css";

createRoot(document.getElementById("root")!).render(createElement(App));
