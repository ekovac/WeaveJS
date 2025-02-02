namespace weavejs.tool
{
	import AbstractFilterEditor = weavejs.editor.AbstractFilterEditor;
	import NumericRangeDataFilterEditor = weavejs.editor.NumericRangeDataFilterEditor;
	import DiscreteValuesDataFilterEditor = weavejs.editor.DiscreteValuesDataFilterEditor;

	import SelectableAttributeComponent = weavejs.ui.SelectableAttributeComponent;
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import ReactUtils = weavejs.util.ReactUtils;
	import ComboBox = weavejs.ui.ComboBox;
	import Checkbox = weavejs.ui.Checkbox;

	import IAttributeColumn = weavejs.api.data.IAttributeColumn;
	import DynamicColumn = weavejs.data.column.DynamicColumn;
	import IColumnStatistics = weavejs.api.data.IColumnStatistics;
	import IQualifiedKey = weavejs.api.data.IQualifiedKey;
	import ILinkableDynamicObject = weavejs.api.core.ILinkableDynamicObject;
	import LinkableBoolean = weavejs.core.LinkableBoolean;
	import LinkableString = weavejs.core.LinkableString;
	import LinkableVariable = weavejs.core.LinkableVariable;
	import ColumnDataFilter = weavejs.data.key.ColumnDataFilter;
	import LinkableDynamicObject = weavejs.core.LinkableDynamicObject;
	import ColumnUtils = weavejs.data.ColumnUtils;
	import ILinkableObjectWithNewProperties = weavejs.api.core.ILinkableObjectWithNewProperties;
	import LinkablePlaceholder = weavejs.core.LinkablePlaceholder;
	import LinkableHashMap = weavejs.core.LinkableHashMap;
	import WeaveAPI = weavejs.WeaveAPI;
	import IColumnWrapper = weavejs.api.data.IColumnWrapper;
	import IVisToolProps = weavejs.api.ui.IVisToolProps;
	import IVisToolState = weavejs.api.ui.IVisToolState;
	import IVisTool = weavejs.api.ui.IVisTool;
	import CallbackCollection = weavejs.core.CallbackCollection;

	export class DataFilterTool extends React.Component<IVisToolProps, IVisToolState> implements IVisTool, ILinkableObjectWithNewProperties
	{
		public filter:LinkableDynamicObject = Weave.linkableChild(this, new LinkableDynamicObject(ColumnDataFilter),this.handleFilterWatcher);
		public filterEditor:LinkableDynamicObject = Weave.linkableChild(this, new LinkableDynamicObject(AbstractFilterEditor),this.handleEditor,true);
		altText:LinkableString = Weave.linkableChild(this, LinkableString);

		
		constructor(props:IVisToolProps) 
		{
			super(props);
			Weave.getCallbacks(this).addGroupedCallback(this, this.forceUpdate);

			// Calling later will make sure instance of DataFilterTool linkableOwner is set
			WeaveAPI.Scheduler.callLater(this, this.initLater);

		}

		private initLater():void
		{
			// only set default path if session state hasn't been set yet
			if (this.filter.triggerCounter == CallbackCollection.DEFAULT_TRIGGER_COUNT)
				this.filter.targetPath = ["defaultSubsetKeyFilter", "filters", Weave.getRoot(this).getName(this)];
			if (!this.getFilter())
				this.setEditorType(DiscreteValuesDataFilterEditor, null);
		}

		//todo does this require in JS version?
		private _editorDiff:any = null;

		private handleFilterWatcher():void
		{

			var _filter:ColumnDataFilter = this.getFilter();

			if ( _filter)
			{
				var values:any[] = _filter.values.getSessionState() as any[] || [];
				if (typeof values[0] == "number" || typeof values[0] == "string")
					this.setEditorType(DiscreteValuesDataFilterEditor, this._editorDiff);
			}
			else
			{
				this.setEditorType(NumericRangeDataFilterEditor, this._editorDiff);
				this._editorDiff = null;
			}

			var _editor:AbstractFilterEditor = this.getFilterEditor();
			if (_editor)
				_editor.filter = _filter;
		}

		private  handleEditor():void
		{
			var _editor:AbstractFilterEditor = this.getFilterEditor();
			if (_editor)
				_editor.filter = this.filter.target as ColumnDataFilter;
		}

		//todo replace with class Type
		private setEditorType(editorType:(typeof AbstractFilterEditor),editorDiff:any):void{
			var editorState:any = this.filterEditor.target && Weave.getState(this.filterEditor.target);

			(Weave.getWeave(this) as Weave).requestObject(this.filter.targetPath, Weave.className(ColumnDataFilter));
			this.filterEditor.requestLocalObject(editorType, false);

			if (this.filterEditor.target && editorDiff)
			{
				editorState = WeaveAPI.SessionManager.combineDiff(editorState, editorDiff);
				Weave.setState(this.filterEditor.target, editorState);
			}

		}
		
		get deprecatedStateMapping()
		{
			return {
				"editor": this.filterEditor,
				"filter": this.filter
			};
		}

		private getFilter():ColumnDataFilter
		{
			return this.filter.target as ColumnDataFilter;
		}

		private  getFilterEditor():AbstractFilterEditor
		{
			return this.filterEditor.target as AbstractFilterEditor;
		}

		private getFilterColumn():DynamicColumn
		{
			return this.getFilter() ? this.getFilter().column : null;
		}

		handleMissingSessionStateProperty(newState:any, property:String):void
		{
			if (property == 'editor')
				this._editorDiff = {
					"layoutMode": "Combobox",
					"showToggle": true
				};
		}

		get title():string
		{
			var column = this.getFilterColumn();
			if (column)
				return Weave.lang('Filter for {0}', ColumnUtils.getTitle(column));
			return Weave.lang('Filter');
		}


		// it has to be function as Filter DynamicColumn is set at Fly

		get selectableAttributes() {
			return new Map<string, (IColumnWrapper | LinkableHashMap)>()
				.set("Filter", this.getFilterColumn());
		}


		renderEditor =(pushCrumb:(title:string,renderFn:()=>JSX.Element , stateObject:any )=>void = null):JSX.Element =>{

			if (!this.filter.target) // scenario arises when tool opened from menu
				this.initLater();
			return <DataFilterEditor filterEditor={ this.filterEditor }  pushCrumb={pushCrumb} selectableAttributes={ this.selectableAttributes }  />
		}

		setEnabled=(value:boolean)=>
		{
			if(this.getFilter())
				this.getFilter().enabled.value = value;
		}

		getEnabled=()=>
		{
			return this.getFilter() ? this.getFilter().enabled.value : false
		}

		render():JSX.Element
		{
			var editorClass = LinkablePlaceholder.getClass(this.filterEditor.target) as typeof AbstractFilterEditor;

			var editor:JSX.Element = null;
			if (editorClass)
				editor = React.createElement(
					editorClass as any,
					{
						ref: (editor:AbstractFilterEditor) => {
							if (editor)
								LinkablePlaceholder.setInstance(this.filterEditor.target, editor);
						},
						filter: this.getFilter()
					}
				);

			return (
				<VBox style={{flex: 1}} padded className="weave-data-filter">
					<div className="weave-data-filter-checkbox">
						<Checkbox
							label={Weave.lang("Enabled")}
							value={this.getEnabled()}
							onChange={this.setEnabled}
						/>
					</div>
					<VBox style={{flex: 1}} className={classNames("weave-data-filter-editor", {disabled: !this.getEnabled()})}>
						{
							editor
						}
					</VBox>
				</VBox>
			)
		}
	}

	Weave.registerClass(
		DataFilterTool,
		["weavejs.tool.DataFilter", "weave.ui::DataFilterTool"],
		[IVisTool, ILinkableObjectWithNewProperties],
		"Data Filter"
	);


	export interface IDataFilterEditorState {

	}

	export interface IDataFilterEditorProps {
		filterEditor:LinkableDynamicObject,
		selectableAttributes:Map<string, (IColumnWrapper | LinkableHashMap)>
		pushCrumb?:(title:string,renderFn:()=>JSX.Element , stateObject:any )=>void
	}


	const FILTER_TYPE  = {
		CONTINUOUS: "Continuous range",
		DISCRETE:"Discrete Values"
	};

	class DataFilterEditor extends React.Component<IDataFilterEditorProps, IDataFilterEditorState>{
		constructor(props:any)
		{
			super(props);
			// ensures any change in Tool will reflect in editor render
			Weave.getCallbacks(this.props.filterEditor).addGroupedCallback(this, this.forceUpdate);
		}

		// required to build UI in render
		private filterEditorMap:any = {
			[FILTER_TYPE.CONTINUOUS]:{
				editorClass: NumericRangeDataFilterEditor,
				options: NumericRangeDataFilterEditor.OPTIONS
			},
			[FILTER_TYPE.DISCRETE]:{
				editorClass: DiscreteValuesDataFilterEditor,
				options: DiscreteValuesDataFilterEditor.OPTIONS
			}
		}

		// event listener for Filter Selection
		onFilterTypeChange = (event:Event) =>
		{
			var key:string = (event.target as HTMLInputElement).value;
			var filterEditorItem:any = this.filterEditorMap[key];
			this.props.filterEditor.requestLocalObject(filterEditorItem.editorClass, false);
		}

		componentWillUnmount():void
		{
			Weave.getCallbacks(this.props.filterEditor).removeCallback(this, this.forceUpdate);
		}

		private last_discreteFilterLayoutMode:string;//required for preserving state between filter types
		private filterTypeSwitched:boolean = false;//indicates if filters have been switched

		//UI event handler for attribute menu layout
		handleFilterTypeChange = (selectedItem:string):void =>
		{
			if (selectedItem)
			{
				var filterEditorItem:any = this.filterEditorMap[selectedItem];

				this.props.filterEditor.requestLocalObject(filterEditorItem.editorClass, false);
				this.filterTypeSwitched = true;
			}

		};

		// event listener for Filter Options
		handleContinuousFilterOptionChange = (isSelected:boolean)=>
		{
			if (this.props.filterEditor.target)
			{
				var forceDiscreteValues:LinkableBoolean  = (this.props.filterEditor.target as NumericRangeDataFilterEditor).forceDiscreteValues;
				forceDiscreteValues.state = isSelected;
			}
		}

		// event listener for Filter Options
		handleDiscreteFilterOptionChange = (selectedItem:string)=>
		{
			if (this.props.filterEditor.target)
			{
				(this.props.filterEditor.target as DiscreteValuesDataFilterEditor).layoutMode.state = selectedItem as string;
				this.last_discreteFilterLayoutMode = (this.props.filterEditor.target as DiscreteValuesDataFilterEditor).layoutMode.state as string;
			}
		}

		render(){

			let labelStyle:React.CSSProperties = {
				textAlign: 'right',
				display:"flex",
				justifyContent: "flex-end"
			};
			// variables used to decide the UI and its options
			var selectedFilter:string;
			var selectedOption:string | boolean; // if its radio string checkbox boolean
			var filterOptionUI:JSX.Element[] = null; // combobox | checkbox

			let filterEditorItem:any = null;
			// session props are used to identify the respective UI
			if (this.props.filterEditor.target instanceof NumericRangeDataFilterEditor)
			{
				selectedFilter = FILTER_TYPE.CONTINUOUS;
				filterEditorItem = this.filterEditorMap[FILTER_TYPE.CONTINUOUS];
				selectedOption = (this.props.filterEditor.target as NumericRangeDataFilterEditor).forceDiscreteValues.state as boolean;
				filterOptionUI =  [
					<span style={labelStyle}></span>,
					<Checkbox value={ selectedOption as boolean}
							  label={ filterEditorItem.options[0] }
							  onChange={ this.handleContinuousFilterOptionChange }
					/>
				];
				this.filterTypeSwitched = false;//reset
			}
			else if (this.props.filterEditor.target instanceof DiscreteValuesDataFilterEditor)
			{
				selectedFilter = FILTER_TYPE.DISCRETE;
				filterEditorItem = this.filterEditorMap[FILTER_TYPE.DISCRETE];

				if (this.filterTypeSwitched)
					(this.props.filterEditor.target as DiscreteValuesDataFilterEditor).layoutMode.state = this.last_discreteFilterLayoutMode as string;/*preserving the layout state*/

				selectedOption = (this.props.filterEditor.target as DiscreteValuesDataFilterEditor).layoutMode.state as string;

				filterOptionUI = [
					<span style={labelStyle}>{ Weave.lang("Layout") }</span>,
					<ComboBox className="weave-sidebar-dropdown"
							  value={ selectedOption }
							  options={ filterEditorItem.options }
							  onChange={ this.handleDiscreteFilterOptionChange }
					/>
				];
				this.filterTypeSwitched = false;//reset
			}

			var filterEditorMapKeys:string[] = Object.keys(this.filterEditorMap);

			let editorConfigs: React.ReactChild[][] = [
				[
					<span style={labelStyle}>{ Weave.lang("Filter Type") }</span>,
					<ComboBox
						className="weave-sidebar-dropdown"
						value={ selectedFilter }
						options={ filterEditorMapKeys }
						onChange={ this.handleFilterTypeChange }
					/>

				]
			];
			
			if (filterOptionUI)
			{
				editorConfigs.push(filterOptionUI)
			}

			return ReactUtils.generateTable({
				body: IVisTool.renderSelectableAttributes(this.props.selectableAttributes, this.props.pushCrumb).concat(editorConfigs),
				classes: {
					td: [
						"weave-left-cell",
						"weave-right-cell"
					]
				}
			});
		}

	}
}
