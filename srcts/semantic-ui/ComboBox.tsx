import * as React from "react";
import * as ReactDOM from "react-dom";
import ReactUtils from "../utils/ReactUtils";
import * as _ from "lodash";
import SmartComponent from "../ui/SmartComponent";

export type ComboBoxOption = {
	label: string,
	value: any
};

export interface ComboBoxProps extends React.HTMLProps<ComboBox>
{
	options?: (string | { label: string, value: any })[];
	valueIncludesLabel?:boolean;
	value?:any;
	onChange?:(value:any)=>void;
	onNew?:(value:any)=>void;
	onRemoved?:(value:any)=>void;
	onAdded?:(value:any)=>void;
	selectFirstOnInvalid?:boolean;
	context?:Element;
	direction?:string;
	valueEqualityFunc?: (valueA:any,valueB:any)=>boolean;
	allowAdditions?:boolean;
	type?:string;
	fluid?:boolean;
	header?:React.ReactChild
	optionStyle?:React.CSSProperties;
}

export interface ComboBoxState
{
	openMenu?:boolean;
	options?: ComboBoxOption[]; // structured version(ComboBoxOption) for props.options
	value?:any | any[]; // we need value as we are updating state from linkreactrefstate
	direction?:string; //upward | downward
}

export default class ComboBox extends SmartComponent<ComboBoxProps, ComboBoxState>
{
	static defaultProps:ComboBoxProps = {
		fluid:true
	};
	
	constructor(props:ComboBoxProps)
	{
		super(props);

		let stateObj:ComboBoxState = this.getStateFromProps(props);
		stateObj.openMenu = false;
		stateObj.direction = "downward";
		this.state = stateObj;
	}

	componentWillReceiveProps(nextProps: ComboBoxProps)
	{
		if(this.props.options != nextProps.options || this.props.value != nextProps.value)
		{
			this.setState(this.getStateFromProps(nextProps));
		}

		if(this.props.direction != nextProps.direction )
		{
			this.setState({
				direction:nextProps.direction
			});
		}
	}


	//props.options turns into structured ComboBoxOption object
	//props.value.value turns into state.value object
	getStateFromProps=(props:ComboBoxProps):ComboBoxState=>
	{
		var options:ComboBoxOption[] = props.options.map((option:(string | { label: string, value: any })) =>
		{
			if(typeof option === "object" && option)
			{
				return option;
			}
			else
			{
				return{
					label: option as string,
					value: option as string
				}
			}
		});

		var value:any = props.value;
		if(props.valueIncludesLabel)
		{
			if(Array.isArray(props.value))
			{
				value = props.value.map((val:any) => val.value);
				options = _.uniq(_.union(props.value, options), "value")
			}
			else
			{
				value = props.value && props.value.value;
				options = _.uniq(_.union(options, [props.value]), "value");
			}
		}
		return {
			value: value,
			options: options
		}
	};

	// important to get option from value
	// as this.state.value are updated programatically (for ex:LinkReactStateref)
	private getOptionFromValue(value:any):ComboBoxOption
	{
		let equalityFunc = this.props.valueEqualityFunc || _.isEqual;
		let index:number =  this.state.options && this.state.options.findIndex((option) => {
			return equalityFunc(option.value, value);
		});
		return this.state.options[index];
	}

	// toggles menu open /close
	onClickListener=(event:React.MouseEvent)=>
	{
		this.setState({
			openMenu:!this.state.openMenu
		});

		this.props.onClick && this.props.onClick(event);

	};


	onChange=(index:number,option:ComboBoxOption,event:React.FormEvent) =>
	{

		if (this.props.onNew && option.label )
		{
			this.props.onNew && this.props.onNew(option.label);
		}
		else
		{
			let value:any | any[] = this.state.options[index].value;

			if (this.props.type == "multiple" )
			{

				this.props.onAdded && this.props.onAdded(value);
				// push to state value array
				(this.state.value as any[]).push(value);
				// put the reference of this.state.value to local value object
				// to call props.onChange
				value = (this.state.value as any[]);

				this.setState({
					value:value,
					openMenu:true
				});

			}
			else
			{
				this.setState({
					value:value,
					openMenu:false
				});
			}

			this.props.onChange && this.props.onChange(value);
		}
	};

	selectedValueRemoveListener=(index:number,option:ComboBoxOption,event:React.MouseEvent)=>
	{
		(this.state.value as any[]).splice(index);
		this.setState({
			value:this.state.value
		});
		this.props.onRemoved && this.props.onRemoved(option.value);
		this.props.onChange && this.props.onChange(this.state.value);
		//required to stop the execution of event listener under this close UI
		event.stopPropagation();
	};



	onDocumentMouseDown=(event:MouseEvent)=>
	{
		// close the menu when you mousedown anywhere except the dropdown item
		var dropDownElt = ReactDOM.findDOMNode(this);
		var targetElt = event.target as HTMLElement;
		if (dropDownElt.contains(targetElt))
		{
			return;
		}
		else
		{
			this.setState({
				openMenu:false
			});
		}

	};

	private menuRect:ClientRect = null;
	// called when menu is mounted and unmounted
	// todo : make combobox update direction even window is resizing
	menuRefCallback=(c:ComboBoxMenu)=>
	{
		if(c)
		{
			ReactUtils.getDocument(this).addEventListener("mousedown", this.onDocumentMouseDown);

			let menuElement = ReactDOM.findDOMNode(c) as HTMLElement;
			this.menuRect = menuElement.getBoundingClientRect();
			// todo : make combobox update direction based on it given parent container, default should be window
			if(this.menuRect.top + this.menuRect.height > window.innerHeight)
			{
				//re-render again
				this.setState({
					direction:"upward"
				});
			}
		}
		else
		{
			this.menuRect = null;
			ReactUtils.getDocument(this).removeEventListener("mousedown", this.onDocumentMouseDown);
		}

	};

	getMenuPositionStyle=():React.CSSProperties =>
	{
		if(this.menuRect && this.state.direction == "upward")
		{
			return {
				top: -this.menuRect.height
			};
		}
		return null;
	};


	renderInput=(isHidden:boolean = true):JSX.Element=>
	{
		let inputProps:any = {
			role:'combobox',
			'aria-expanded': this.state.openMenu ? "true" : "false",
			'aria-haspopup': this.state.openMenu ? "true" : "false",
			'aria-labelledby': (this.props as any)['aria-labelledby'],
			'aria-label': (this.props as any)['aria-label'],
			type:isHidden ? "hidden":"",
		};

		return <input {...inputProps}/>
	};


	render()
	{


		let headerUI:JSX.Element = null;
		if(this.props.header)
		{
			headerUI = <div className="header">{this.props.header}</div>;
		}

		let textUIs:JSX.Element[] | JSX.Element = null;
		let selectedOptions:ComboBoxOption | ComboBoxOption[] = null;
		if(this.state.value)
		{
			if(Array.isArray(this.state.value))
			{
				selectedOptions =  [] ;
				textUIs =(this.state.value as any[]).map( (value:any, index:number) => {
					let option:ComboBoxOption = this.getOptionFromValue(value);
					if(option)
						(selectedOptions as ComboBoxOption[])[index] = option;
					//option may not be available instantly for those cases render the value
					//todo: if its object convert to string ?
					let valueText:string = option && option.label? option.label : (typeof value == "string") ? value : "";
					return <a key={index}
					          className="ui label">
								{Weave.lang(valueText)}
								<i className="delete icon" onClick={this.selectedValueRemoveListener.bind(this,index,option)}></i>
							</a>;
				});
			}
			else
			{
				let option:ComboBoxOption = this.getOptionFromValue(this.state.value);
				if(option)
					selectedOptions = option;
				//option may not be available instantly for those cases render the value
				let valueText:string = option && option.label? option.label : (typeof this.state.value == "string") ? this.state.value : "";
				textUIs = <div className="text">{Weave.lang(valueText)}</div>;
			}
		}
		else
		{
			textUIs = <div className="default text">{this.props.placeholder}</div>;
		}

		let menuUI:JSX.Element = null;
		if(this.state.openMenu )
		{
			menuUI = <ComboBoxMenu ref={this.menuRefCallback}
			                       className="menu transition visible"
			                       style={this.getMenuPositionStyle()}
			                       onSelect={this.onChange as any}
			                       selectedOptions={selectedOptions}
			                       options={this.state.options}/>;
		}


		let styleObj:React.CSSProperties =  _.merge({},this.props.style,{
													position:"relative",
													transform:"none" /* override Semantic UI rotateZ(0)*/
												});

		let inputUI:JSX.Element = this.renderInput();
		let className:string = "ui " + (this.props.type || "") + (this.props.fluid ? " fluid":"") +" selection dropdown " + this.state.direction +" " + (this.props.className || "")

		return (
			<div onClick={this.onClickListener}
			     tabIndex={0}
			     className={className}
			     style={styleObj}>
					{inputUI}
					<i className="dropdown icon"/>
					{textUIs}
					{menuUI}
			</div>
		);
	}


}

interface ComboBoxMenuProps extends React.HTMLProps<ComboBoxMenu>
{
	selectedOptions:ComboBoxOption | ComboBoxOption[];
	options:ComboBoxOption[];
	optionStyle?:React.CSSProperties;
}

interface ComboBoxMenuState
{

}

class ComboBoxMenu extends SmartComponent<ComboBoxMenuProps, ComboBoxMenuState>
{
	constructor(props:ComboBoxMenuProps)
	{
		super(props);
	}


	clickListener=(index:number,option:ComboBoxOption,event:React.MouseEvent) =>
	{
		event.preventDefault();
		event.stopPropagation();
		this.props.onSelect && (this.props.onSelect as any)(index,option,event);
	};

	render()
	{
		let styleObject:React.CSSProperties = _.merge({},this.props.style,{
			display:"block",
			position:"absolute"
		});

		let isMultipleMode:boolean = Array.isArray(this.props.selectedOptions);
		let optionsUI:JSX.Element[] = this.props.options.map((option:ComboBoxOption,index:number)=>{
			let className = "item";
			if(isMultipleMode)
			{
				if((this.props.selectedOptions as ComboBoxOption[]).indexOf(option) != -1)
				{
					return null;
				}
			}
			else
			{
				if(this.props.selectedOptions  == option)
					className = className + " active selected";
			}
			return  <div className={className}
			             role="option"
			             onClick={this.clickListener.bind(this,index,option)}
			             style={this.props.optionStyle}
			             key={index}
			             data-value={index}>
							{Weave.lang(option.label)}
					</div>;
		});

		return  <div style={styleObject}
		             tabIndex={-1}
		             className={this.props.className}>
					{optionsUI}
				</div>

	}

}




