namespace weavejs.menu
{
	import MenuBarItemProps = weavejs.ui.menu.MenuBarItemProps;
	import MenuItemProps = weavejs.ui.menu.MenuItemProps;
	import IDataSource = weavejs.api.data.IDataSource;
	import IDataSource_File = weavejs.api.data.IDataSource_File;
	import IDataSource_Service = weavejs.api.data.IDataSource_Service;
	import IWeaveMenus = weavejs.menu.IWeaveMenus;

	/* Import editors and their data sources */
	import WeaveDataSource = weavejs.data.source.WeaveDataSource;
	import WeaveDataSourceEditor = weavejs.editor.WeaveDataSourceEditor;

	import CSVDataSource = weavejs.data.source.CSVDataSource;
	import CSVDataSourceEditor = weavejs.editor.CSVDataSourceEditor;

	import DBFDataSource = weavejs.data.source.DBFDataSource;
	import DBFDataSourceEditor = weavejs.editor.DBFDataSourceEditor;

	import GeoJSONDataSource = weavejs.data.source.GeoJSONDataSource;
	import GeoJSONDataSourceEditor = weavejs.editor.GeoJSONDataSourceEditor;

	import CensusDataSource = weavejs.data.source.CensusDataSource;
	import CensusDataSourceEditor = weavejs.editor.CensusDataSourceEditor;

	import CKANDataSource = weavejs.data.source.CKANDataSource;
	import CKANDataSourceEditor = weavejs.editor.CKANDataSourceEditor;

	import CachedDataSource = weavejs.data.source.CachedDataSource;
	import CachedDataSourceEditor = weavejs.editor.CachedDataSourceEditor;

	import SpatialJoinTransform = weavejs.data.source.SpatialJoinTransform;
	import SpatialJoinTransformEditor = weavejs.editor.SpatialJoinTransformEditor;

	import ForeignDataMappingTransform = weavejs.data.source.ForeignDataMappingTransform;
	import ForeignDataMappingTransformEditor = weavejs.editor.ForeignDataMappingTransformEditor;

	import GroupedDataTransform = weavejs.data.source.GroupedDataTransform;
	import GroupedDataTransformEditor = weavejs.editor.GroupedDataTransformEditor;
	import IDataSourceEditorProps = weavejs.editor.IDataSourceEditorProps;
	import IAttributeColumn = weavejs.api.data.IAttributeColumn;
	import ReferencedColumn = weavejs.data.column.ReferencedColumn;
	import ColumnMetadata = weavejs.api.data.ColumnMetadata;
	import DataType = weavejs.api.data.DataType;
	import IKeyFilter = weavejs.api.data.IKeyFilter;
	import ColumnUtils = weavejs.data.ColumnUtils;
	import JS = weavejs.util.JS;
	import ClassRegistryImpl = weavejs.core.ClassRegistryImpl;

	export class DataMenu implements MenuBarItemProps
	{
		constructor(owner:IWeaveMenus)
		{
			this.owner = owner;
		}

		owner:IWeaveMenus;
		label:string = "Data";

		get menu():MenuItemProps[]
		{
			return [].concat(
				{
					enabled: this.owner.enableDataManagerItem(),
					label: Weave.lang('Manage data...'),
					click: this.owner.openDataManager
				},
				{},
	//			{
	//				shown: Weave.beta,
	//				label: <FileInput onChange={(()=>alert('Not implemented yet')) || this.fileMenu.openFile} accept={this.fileMenu.getSupportedFileTypes(true).join(',')}>{Weave.lang("Import data file(s)... (not implemented yet)")}</FileInput>
	//			},
	//			{},
				this.getExportItems()
			);
		}
				
		getExportItems():MenuItemProps[]
		{
			return [
				{
					enabled: this.getColumnsToExport().length > 0,
					label: Weave.lang("Export CSV"),
					click: this.exportCSV
				}
			];
		}

		static editorRegistry = new Map<typeof IDataSource, React.ComponentClass<IDataSourceEditorProps>>()
			.set(CSVDataSource, CSVDataSourceEditor)
			.set(DBFDataSource, DBFDataSourceEditor)
			.set(GeoJSONDataSource, GeoJSONDataSourceEditor)
			.set(CensusDataSource, CensusDataSourceEditor)
			.set(CKANDataSource, CKANDataSourceEditor)
			.set(WeaveDataSource, WeaveDataSourceEditor)
			.set(CachedDataSource, CachedDataSourceEditor)
			.set(SpatialJoinTransform, SpatialJoinTransformEditor)
			.set(ForeignDataMappingTransform, ForeignDataMappingTransformEditor)
			.set(GroupedDataTransform, GroupedDataTransformEditor);

		static getDataSourceItems(weave:Weave, onCreateItem?:(dataSource:IDataSource)=>void)
		{
			var registry = WeaveAPI.ClassRegistry;
			var impls = registry.getImplementations(IDataSource);
			
			// filter out those data sources without editors
			impls = impls.filter(impl => DataMenu.editorRegistry.has(impl));
		
			var items:MenuItemProps[] = [];
			for (var partition of ClassRegistryImpl.partitionClassList(impls, IDataSource_File, IDataSource_Service))
			{
				if (items.length)
					items.push({});
				partition.forEach(impl => {
					var label = Weave.lang(registry.getDisplayName(impl));
					items.push({
						get shown() {
							return Weave.beta || !DataMenu.isBeta(impl);
						},
						get label() {
							if (DataMenu.isBeta(impl))
								return label + " (beta)";
							return label;
						},
						click: () => {
							var baseName = WeaveAPI.ClassRegistry.getDisplayName(impl);
							var path = [weave.root.generateUniqueName(baseName)];
							var dataSource = weave.requestObject(path, impl);
							if (onCreateItem)
								onCreateItem(dataSource);
						}
					});
				});
			}
			
			return items;
		}

		static isBeta(impl:new()=>IDataSource):boolean
		{
			return impl == CensusDataSource
				|| impl == GroupedDataTransform
				|| impl == SpatialJoinTransform;
		}
		
		getColumnsToExport=()=>
		{
			var columnSet = new Set<IAttributeColumn>();
			for (var rc of Weave.getDescendants(this.owner.weave.root, ReferencedColumn))
			{
				var col = rc.getInternalColumn();
				if (col && col.getMetadata(ColumnMetadata.DATA_TYPE) != DataType.GEOMETRY)
					columnSet.add(col)
			}
			return JS.toArray(columnSet.values());
		}

		exportCSV=()=>
		{
			var columns = this.getColumnsToExport();
			var filter = Weave.AS(this.owner.weave.getObject('defaultSubsetKeyFilter'), IKeyFilter);
			var csv = ColumnUtils.generateTableCSV(columns, filter);
			FileSaver.saveAs(new Blob([csv]), "Weave-data-export.csv");
		}
	}
}
