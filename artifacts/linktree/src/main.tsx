import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";
import { API_URL } from "./config";

setBaseUrl(API_URL);

createRoot(document.getElementById("root")!).render(<App />);
