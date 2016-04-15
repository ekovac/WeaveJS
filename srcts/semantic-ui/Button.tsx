import * as React from "react";

export interface ButtonProps extends React.HTMLProps<HTMLButtonElement>
{
	colorClass?: string;
}

export interface ButtonState
{	
}

export default class Button extends React.Component<ButtonProps, ButtonState>
{
	constructor(props:ButtonProps)
	{
		super(props);
	}
	
	static defaultProps:ButtonProps = {
		colorClass: "primary"
	}
	
	render()
	{
		return (
			<button {...this.props} className={"ui " + (this.props.color ? this.props.color:"") + " button " + (this.props.className || "")}>
				{
					this.props.children
				}
			</button>
		);
	}
}
