"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consoleTelemetrySink = void 0;
const consoleTelemetrySink = (event) => {
    console.log("[telemetry]", JSON.stringify(event));
};
exports.consoleTelemetrySink = consoleTelemetrySink;
