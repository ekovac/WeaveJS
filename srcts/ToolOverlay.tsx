/// <reference path="../typings/react/react.d.ts"/>

import * as React from "react";

const toolOverlayStyle:React.CSSProperties = {
    background: "#000",
    opacity: .2,
    zIndex: 3,
    boxSizing: "border-box",
    backgroundClip: "padding",
    position: "fixed",
    visibility: "hidden",
    pointerEvents: "none"
};

interface IToolOverlayProps extends React.Props<ToolOverlay> {

}

interface IToolOverlayState {
    style: React.CSSProperties;
}
class ToolOverlay extends React.Component<IToolOverlayProps, IToolOverlayState> {

    constructor(props:IToolOverlayProps) {
        super(props);
        this.state = {
            style: toolOverlayStyle
        };
    }

    render() {
        return <div style={this.state.style}/>;
    }
}

export default ToolOverlay;
