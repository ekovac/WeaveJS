import * as React from "react";
import * as FileSaver from "filesaver.js";
import {MenuBarItemProps} from "../react-ui/MenuBar";
import {MenuItemProps} from "../react-ui/Menu";
import DataSourceManager from "../ui/DataSourceManager";
import IDataSource = weavejs.api.data.IDataSource;
import FileMenu from "./FileMenu";
import FileInput from "../react-ui/FileInput";
import ToolsMenu from "./ToolsMenu";

export default class DataMenu implements MenuBarItemProps
{
	constructor(weave:Weave, createObject:(type:new(..._:any[])=>any)=>void)
	{
		this.weave = weave;
		this.fileMenu = new FileMenu(weave);
		this.toolsMenu = new ToolsMenu(weave, createObject);
		this.createObject = createObject;
	}

	label:string = "Data";
	weave:Weave;
	toolsMenu:ToolsMenu;//menu to be passed for creating visualizations from tha datasource manager
	fileMenu:FileMenu; // temp solution
	createObject:(type:new(..._:any[])=>any)=>void;
	
	get menu():MenuItemProps[]
	{
		return [].concat(
			{
				shown: Weave.experimental,
				label: <FileInput onChange={(()=>alert('Not implemented yet')) || this.fileMenu.openFile} accept={this.fileMenu.getSupportedFileTypes(true).join(',')}>{Weave.lang("Import data file(s)... (not implemented yet)")}</FileInput>
			},
			{
				enabled: this.getColumnsToExport().length > 0,
				label: Weave.lang("Export CSV"),
				click: this.exportCSV
			},
			{},
			{
				label: Weave.lang('Manage or browse data'),
				click: () => DataSourceManager.openInstance(this)
			},
			{},
			this.getDataSourceItems()
		);
	}

	getDataSourceItems()
	{
		var registry = weavejs.WeaveAPI.ClassRegistry;
		var impls = registry.getImplementations(IDataSource);
		
		// filter out those data sources without editors
		impls = impls.filter(impl => DataSourceManager.editorRegistry.has(impl));
		
		return impls.map(impl => {
			var label = Weave.lang('+ {0}', registry.getDisplayName(impl));
			return {
				get shown() {
					return Weave.experimental || !DataMenu.isExperimental(impl);
				},
				get label() {
					if (DataMenu.isExperimental(impl))
						return label + " (experimental)";
					return label;
				},
				click: this.createObject.bind(this, impl)
			}
		});
	}

	static isExperimental(impl:new()=>IDataSource):boolean
	{
		return impl == weavejs.data.source.CensusDataSource;
	}
	
	getColumnsToExport=()=>
	{
		var columnSet = new Set<weavejs.api.data.IAttributeColumn>();
		for (var rc of Weave.getDescendants(this.weave.root, weavejs.data.column.ReferencedColumn))
		{
			var col = rc.getInternalColumn();
			if (col && col.getMetadata(weavejs.api.data.ColumnMetadata.DATA_TYPE) != weavejs.api.data.DataType.GEOMETRY)
				columnSet.add(col)
		}
		return weavejs.util.JS.toArray(columnSet.values());
	}

	exportCSV=()=>
	{
		var columns = this.getColumnsToExport();
		var filter = Weave.AS(this.weave.getObject('defaultSubsetKeyFilter'), weavejs.api.data.IKeyFilter);
		var csv = weavejs.data.ColumnUtils.generateTableCSV(columns, filter);	
		FileSaver.saveAs(new Blob([csv]), "Weave-data-export.csv");
	}
}
