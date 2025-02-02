namespace weavejs.editor.manager
{
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import Label = weavejs.ui.flexbox.Label;

	import InteractiveTour = weavejs.dialog.InteractiveTour;
	import List = weavejs.ui.List;
	import IDataSourceEditorProps = weavejs.editor.IDataSourceEditorProps;
	import MenuItemProps = weavejs.ui.menu.MenuItemProps;
	import ControlPanel = weavejs.editor.ControlPanel;
	import DataMenu = weavejs.menu.DataMenu;
	import CenteredIcon = weavejs.ui.CenteredIcon;
	import LogComponent = weavejs.ui.LogComponent;
	import IDataSource = weavejs.api.data.IDataSource;

	import FileMenu = weavejs.menu.FileMenu;
	import ListOption = weavejs.ui.ListOption;
	import Dropzone = ReactDropzone.Dropzone;

	import WeaveDataSourceEditor = weavejs.editor.WeaveDataSourceEditor;
	import CSVDataSourceEditor = weavejs.editor.CSVDataSourceEditor;
	import DBFDataSourceEditor = weavejs.editor.DBFDataSourceEditor;
	import GeoJSONDataSourceEditor = weavejs.editor.GeoJSONDataSourceEditor;
	import CensusDataSourceEditor = weavejs.editor.CensusDataSourceEditor;
	import CKANDataSourceEditor = weavejs.editor.CKANDataSourceEditor;
	import CachedDataSourceEditor = weavejs.editor.CachedDataSourceEditor;
	import SpatialJoinTransformEditor = weavejs.editor.SpatialJoinTransformEditor;
	import ForeignDataMappingTransformEditor = weavejs.editor.ForeignDataMappingTransformEditor;
	import GroupedDataTransformEditor = weavejs.editor.GroupedDataTransformEditor;

	export interface IDataSourceManagerProps
	{
		weave:Weave;
		fileMenu?:FileMenu;
	}

	export interface IDataSourceManagerState
	{
		selected?:IDataSource;
		rejected?:boolean
	}

	export class DataSourceManager extends React.Component<IDataSourceManagerProps,IDataSourceManagerState>
	{
		private selectedIndex:number = 0;

		constructor(props:IDataSourceManagerProps)
		{
			super(props);
			this.state = {
				rejected: false
			};
		}

		componentDidMount()
		{
			this.props.weave.root.childListCallbacks.addGroupedCallback(this, this.updateDataSources, true);
		}

		componentWillUnmount()
		{
			this.props.weave.root.childListCallbacks.removeCallback(this, this.updateDataSources);
		}

		updateDataSources()
		{
			let dataSources = this.props.weave.root.getObjects(IDataSource);

			dataSources.forEach((ds:IDataSource):void =>{
				Weave.getCallbacks(ds).addGroupedCallback(this, this.forceUpdate);//adding callbacks to every datasource
			});

			this.forceUpdate();
		}

		setSelectedDataSource=(dataSource:IDataSource)=>
		{
			this.setState({
				selected: dataSource
			});
		}

		getSelectedDataSource()
		{
			let sources = this.props.weave.root.getObjects(IDataSource);
			var selected = this.state.selected;
			if (!selected || Weave.wasDisposed(selected))
			{
				this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, sources.length - 1));
				selected = sources[this.selectedIndex];
			}
			else
			{
				this.selectedIndex = sources.indexOf(selected);
			}
			
			return selected;
		}

		refreshDataSource(dataSource:IDataSource)
		{
			dataSource.hierarchyRefresh.triggerCallbacks();
			
			// TEMPORARY SOLUTION until all data sources behave correctly - force creating a new copy
			var root = this.props.weave.root;
			var name = root.getName(dataSource);
			if (name)
			{
				var names = root.getNames();
				root.requestObjectCopy(name, dataSource);
				root.setNameOrder(names);
			}
		}

		removeDataSource(dataSource:IDataSource)
		{
			let root = this.props.weave.root;
			root.removeObject(root.getName(dataSource));
		}

		handleDataFileDrop = (file:File):void =>
		{
			var extension = file.name.split('.').pop();
			if (this.props.fileMenu.getSupportedFileTypes(true).indexOf('.' + extension) != -1)//if file supported
			{
				this.props.fileMenu.handleOpenedFile(file);
			}
			else
			{
				console.log("This data format is not supported yet");//TODO report this status in the editor?
			}

		};

		render():JSX.Element
		{
			let root = this.props.weave.root;

			let listOptions:ListOption[] = root.getObjects(IDataSource).map(dataSource => {
				let icon = "fa fa-fw " + (dataSource.isLocal ? "fa-file-o" : "fa-globe");
				let iconMessage = dataSource.isLocal ? "Does not use remote resources." : "Uses remote resources.";
				return {
					label: (
						<HBox padded style={{flex: 1, alignItems: "center"}}>
							<CenteredIcon className="" iconProps={{ className: icon, title: Weave.lang(iconMessage) }}/>
							<Label style={{flex: 1}} children={dataSource.getLabel()}/>
							<CenteredIcon onClick={()=>this.refreshDataSource(dataSource)}
										  iconProps={{ className: "fa fa-refresh", title: Weave.lang("Refresh this datasource") }}/>
							<CenteredIcon onClick={()=>this.removeDataSource(dataSource)}
										  iconProps={{ className: "fa fa-times", title: Weave.lang("Delete this datasource") }}/>
						</HBox>
					),
					value: dataSource
				};
			});

			let editorJsx:JSX.Element;
			let dataSource = this.getSelectedDataSource();

			let editorStyle:React.CSSProperties = {
				flex: 1
			};

			if (dataSource && !Weave.wasDisposed(dataSource))
			{
				let EditorClass = DataMenu.editorRegistry.get(dataSource.constructor as typeof IDataSource);
				if (EditorClass)
				{
					editorJsx = (
						<VBox className="weave-data-source-manager-editor" style={editorStyle}>
							<EditorClass dataSource={dataSource}/>
						</VBox>
					);
				}
				else
				{
					_.merge(editorStyle, {justifyContent: "center", alignItems: "center"});
					editorJsx = (
						<VBox className="weave-data-source-manager-editor" style={editorStyle}>
							<div className="ui centered header">
								{Weave.lang("Editor not yet implemented for this data source type.")}
							</div>
						</VBox>
					);
				}

			}
			else
			{
				_.merge(editorStyle, {justifyContent: "center", alignItems: "center", width: '100%', position:'relative', fontSize:'24px'});
				editorJsx = (
					<div style={{padding: '10px', display: "flex", flex: 1}}>
						<Dropzone
							style={{display: "flex", flexDirection: "column", alignItems: "center", flex: 1}}
							className={"weave-dropzone-file"}
							activeStyle={{border: "8px solid #CCC"}}
							onDropAccepted={(files:File[]) => {
								files.forEach((file) => {
									this.handleDataFileDrop(file);
								});
								this.setState({
									rejected:false /*to remove the status of a previous rejection*/
								});
							}}
							onDropRejected={(files:File[]) => {
								this.setState({
									rejected:true
								});
							}}
							accept=".csv,.geojson,.json,.txt,.tsv,.xls,.shp,.dbf"
							disableClick={false}
						>
							<VBox className="weave-data-source-manager-editor" style={editorStyle}>
								<span className="fa fa-files-o fa-th-large fa-5x"></span>

								<VBox style={{ display: 'flex', fontSize: '16px', padding: '15', alignItems : 'center'}}>
									{"Drag and drop a data file to create a datasource"}
								</VBox>

								{this.state.rejected ?
								<LogComponent style={{left:'10px', top:'10px',right:'10px',flex:1, position:'absolute', fontSize:'medium'}} header={ Weave.lang("File Import Error") }
											  messages={ [Weave.lang("The specified file could not be imported. Only files with the following extensions are allowed: .csv, .tsv, .txt, .shp, .dbf, .geojson, .zip, .json")] }
											  clearFunc={ (event)=> {
												this.setState({rejected:false});
												event.stopPropagation();/* without this when the close icon is clicked it causes the file explorer to open*/
											  } }
								/>
									: null}

							</VBox>
						</Dropzone>
					</div>
				);
			}

			return (
				<HBox className="ui bottom attached segments" style={ {flex: 1} }  onMouseEnter={() => this.forceUpdate()} >
					<VBox style={{width: 250}} className="weave-data-source-manager-sidebar">
						<VBox className="ui vertical attached segments" style={{flex:1, justifyContent:"space-between",border:"none",borderRadius:0}}>
							<VBox className="ui basic inverted segment" style={{flex: 1, overflow: "auto", padding: 0,border:"none",borderRadius:0}}>
								<div className="ui medium header" style={{padding: 0, paddingLeft: 14, paddingTop: 14}}>{Weave.lang("Connected data sources")}</div>
								<VBox style={{alignItems: listOptions.length ? null:"center"}}>
									{
										listOptions.length
										?	<List
												options={listOptions}
												multiple={false}
												selectedValues={ [dataSource] }
												onChange={ (selectedValues:IDataSource[]) => { this.setSelectedDataSource(selectedValues[0]);  }}
											/>
										:	<div className="weave-list-item" style={{alignSelf: "flex-start", cursor: "default", pointerEvents: "none"}}>
												{Weave.lang("(None)")}
											</div>
									}
								</VBox>
							</VBox>
							<VBox className="ui inverted segment" style={{overflow: "auto", padding: 0, border:"none",borderRadius:0}}>
								<div className="ui medium header" style={{ paddingLeft: 14, paddingTop: 14}}>{Weave.lang("Add more data sources")}</div>
								{
									DataMenu.getDataSourceItems(this.props.weave, this.setSelectedDataSource).map((dsItem, index) => {
										return dsItem.shown
											?	<HBox key={index}
													ref={InteractiveTour.getComponentRefCallback(dsItem.label as string)}
													onClick={() => {
														dsItem.click();
														InteractiveTour.targetComponentOnClick(dsItem.label as string);
													}}
													className="weave-data-source-item"
													style={{justifyContent: "space-between", padding: 5}}>
													{Weave.lang(dsItem.label as string)}
													<CenteredIcon className="" iconProps={{ className:"fa fa-plus" }}/>
												</HBox>
											:	null
									})
								}
							</VBox>
						</VBox>
					</VBox>
					{editorJsx}
				</HBox>
			);
		}
	}
}
