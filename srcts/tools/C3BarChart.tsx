///<reference path="../../typings/c3/c3.d.ts"/>
///<reference path="../../typings/d3/d3.d.ts"/>
///<reference path="../../typings/lodash/lodash.d.ts"/>
///<reference path="../../typings/react/react.d.ts"/>
///<reference path="../../typings/weave/weavejs.d.ts"/>

import {IVisToolProps} from "./IVisTool";
import AbstractC3Tool from "./AbstractC3Tool";
import * as _ from "lodash";
import * as d3 from "d3";
import FormatUtils from "../utils/FormatUtils";
import * as React from "react";
import * as c3 from "c3";
import {ChartConfiguration, ChartAPI} from "c3";
import StandardLib from "../utils/StandardLib";

import IQualifiedKey = weavejs.api.data.IQualifiedKey;
import DynamicColumn = weavejs.data.column.DynamicColumn;
import ILinkableHashMap = weavejs.api.core.ILinkableHashMap;
import IAttributeColumn = weavejs.api.data.IAttributeColumn;
import LinkableHashMap = weavejs.core.LinkableHashMap;
import AlwaysDefinedColumn = weavejs.data.column.AlwaysDefinedColumn;
import FilteredKeySet = weavejs.data.key.FilteredKeySet;
import ColorRamp = weavejs.util.ColorRamp;
import LinkableString = weavejs.core.LinkableString;
import LinkableBoolean = weavejs.core.LinkableBoolean;

declare type Record = {
    id: IQualifiedKey,
	heights: { xLabel: string } & {[columnName:string]: number},
	numericValues: {
		sort: number,
		yLabel: number,
		xLabel: number
	},
	stringValues: {
		yLabel: string,
		xLabel: string,
		color: string,
	}
};

declare type RecordHeightsFormat<T> = { xLabel: T } & {[columnName:string]: T};

const GROUP:string = 'group';
const STACK:string = 'stack';
const PERCENT_STACK:string = 'percentStack';

export default class C3BarChart extends AbstractC3Tool
{
    heightColumns = Weave.linkableChild(this, new LinkableHashMap(IAttributeColumn));
    labelColumn = Weave.linkableChild(this, DynamicColumn);
    sortColumn = Weave.linkableChild(this, DynamicColumn);
    colorColumn = Weave.linkableChild(this, new AlwaysDefinedColumn("#C0CDD1"));
    chartColors = Weave.linkableChild(this, new ColorRamp(ColorRamp.getColorRampByName("Paired")));
    groupingMode = Weave.linkableChild(this, new LinkableString(STACK, this.verifyGroupingMode))
    horizontalMode = Weave.linkableChild(this, new LinkableBoolean(true));
    showValueLabels = Weave.linkableChild(this, new LinkableBoolean(true));
    showXAxisLabel = Weave.linkableChild(this, new LinkableBoolean(false));

    private verifyGroupingMode(mode:string):boolean
	{
		return [GROUP, STACK, PERCENT_STACK].indexOf(mode) >= 0;
	}

    get yLabelColumn():IAttributeColumn
    {
        return this.heightColumns.getObjects()[0] || this.sortColumn;
    }
	
    private RECORD_FORMAT = {
		id: IQualifiedKey,
		heights: {} as RecordHeightsFormat<IAttributeColumn>,
		numericValues: {
			sort: this.sortColumn,
			yLabel: this.yLabelColumn,
			xLabel: this.labelColumn,
		},
		stringValues: {
			yLabel: this.yLabelColumn,
			xLabel: this.labelColumn,
			color: this.colorColumn,
		}
	};

    private RECORD_DATATYPE = {
		heights: {} as RecordHeightsFormat<new ()=>(String|Number)>,
		numericValues: {
			sort: Number,
			yLabel: Number,
			xLabel: Number,
		},
		stringValues: {
			yLabel: String,
			xLabel: String,
			color: String,
		}
	};

    private yLabelColumnDataType:string;
    private heightColumnNames:string[];
    private heightColumnsLabels:string[];
    protected c3Config:ChartConfiguration;
    protected c3ConfigYAxis:c3.YAxisConfiguration;
    private records:Record[];
    protected chart:ChartAPI;

    private busy:boolean;
    private dirty:boolean;

    constructor(props:IVisToolProps)
    {
        super(props);

        Weave.getCallbacks(this.selectionFilter).addGroupedCallback(this, this.updateStyle);
        Weave.getCallbacks(this.probeFilter).addGroupedCallback(this, this.updateStyle);

		this.filteredKeySet.setColumnKeySources([this.sortColumn]);
        this.filteredKeySet.keyFilter.targetPath = ['defaultSubsetKeyFilter'];
		this.selectionFilter.targetPath = ['defaultSelectionKeySet'];
		this.probeFilter.targetPath = ['defaultProbeKeySet'];

        this.validate = _.debounce(this.validate.bind(this), 30);

        this.c3Config = {
            size: {
                width: this.props.style.width,
                height: this.props.style.height
            },
            padding: {
                top: this.margin.top.value,
                bottom: 0, // use axis.x.height instead
                left: this.margin.left.value,
                right: this.margin.right.value
            },
            data: {
                json: [],
                type: "bar",
                xSort: false,
                names: {},
                selection: {
                    enabled: true,
                    multiple: true,
                    draggable: true

                },
                labels: {
                    format: (v, id, i, j) => {
                        if (this.showValueLabels.value)
                        {
                            return v;
                        }
                        else
                        {
                            return "";
                        }
                    }
                },
                order: null,
                color: (color:string, d:any):string => {
                    if (this.heightColumnNames.length === 1 && d && d.hasOwnProperty("index"))
                    {
						// use the color from the color column because we only have one height
						return this.records[d.index].stringValues.color;
                    }
                    else
                    {
						// use the color from the color ramp
                        return color;
                    }
                },
                onclick: (d:any) => {
                },
                onselected: (d:any) => {
                    if (d && d.hasOwnProperty("index"))
                    {
						if (this.selectionKeySet)
							this.selectionKeySet.addKeys([this.records[d.index].id]);
                    }
                },
                onunselected: (d:any) => {
                    if (d && d.hasOwnProperty("index"))
                    {
                        if (this.selectionKeySet)
							this.selectionKeySet.removeKeys([this.records[d.index].id]);
                    }
                },
                onmouseover: (d:any) => {
                    if (d && d.hasOwnProperty("index"))
                    {
						if (this.probeKeySet)
                        	this.probeKeySet.replaceKeys([]);;
                        
						var record:Record = this.records[d.index];
						var columnNamesToValue:{[columnName:string] : string} = {};
                        var columnNamesToColor:{[columnName:string] : string} = {};
                        
						var qKey:IQualifiedKey = this.records[d.index].id;
						
						var columns = this.heightColumns.getObjects() as IAttributeColumn[];
						for (var index in columns)
						{
							var column = columns[index]; 
							var columnName:string = column.getMetadata("title");
							var color = this.chartColors.getColorFromNorm(Number(index) / (columns.length - 1));
							columnNamesToValue[columnName] = column.getValueFromKey(qKey, String);
							// columnNamesToColor can be done only on heightColumns change.
							columnNamesToColor[columnName] = "#" + weavejs.util.StandardLib.numberToBase(color, 16, 6);
						}

                        var title:string = record.stringValues.xLabel;
						
						if (this.probeKeySet)
							this.probeKeySet.replaceKeys([qKey]);
						
						if (this.props.toolTip)
	                        this.props.toolTip.setState({
	                            x: this.chart.internal.d3.event.pageX,
	                            y: this.chart.internal.d3.event.pageY,
	                            showToolTip: true,
	                            title: title,
	                            columnNamesToValue: columnNamesToValue,
	                            columnNamesToColor: columnNamesToColor
	                        });
                    }
                },
                onmouseout: (d:any) => {
                    if (d && d.hasOwnProperty("index"))
                    {
						if (this.probeKeySet)
							this.probeKeySet.replaceKeys([]);
						if (this.props.toolTip)
	                        this.props.toolTip.setState({
	                           showToolTip: false
	                        });
                    }
                }
            },
            axis: {
                x: {
                    type: "category",
                    label: {
                        text: "",
                        position: "outer-center"
                    },
					height: this.margin.bottom.value,
                    tick: {
                        rotate: -45,
                        culling: {
                            max: null
                        },
                        multiline: false,
                        format: (num:number):string => {
							var record = this.records[num];
							if (record)
							{
								if (this.element && this.props.style.height > 0 && this.margin.bottom)
								{
									var labelHeight:number = this.margin.bottom.value/Math.cos(45*(Math.PI/180));
									var labelString:string = record.stringValues.xLabel;
									if (labelString)
									{
										var stringSize:number = StandardLib.getTextWidth(labelString, this.getFontString());
										var adjustmentCharacters:number = labelString.length - Math.floor(labelString.length * (labelHeight / stringSize));
										return adjustmentCharacters > 0 ? labelString.substring(0, labelString.length - adjustmentCharacters - 3) + "..." : labelString;
									}
									else
									{
										return "";
									}
								}
								else
								{
									return record.stringValues.xLabel;
								}
                            }
                            else
                            {
                                return "";
                            }
                        }
                    }
                },
                rotated: false
            },
			tooltip: {show: false },
			interaction: { brighten: false },
            transition: { duration: 0 },
            grid: {
                x: {
                    show: true
                },
                y: {
                    show: true
                }
            },
            bindto: null,
            bar: {
                width: {
                    ratio: 0.8
                }
            },
            legend: {
                show: false,
                position: "bottom"
            },
            onrendered: () => {
                this.busy = false;
                this.updateStyle();
                if (this.dirty)
                    this.validate();
            }
        };
        this.c3ConfigYAxis = {
            show: true,
            label: {
                text:"",
                position: "outer-middle"
            },
            tick: {
                fit: false,
                multiline: false,
                format: (num:number):string => {
					var record = this.records[num];
                    if (record && this.yLabelColumnDataType !== "number")
                    {
                        return record.stringValues.yLabel || "";
                    }
                    else if (this.groupingMode.value === PERCENT_STACK)
                    {
                        return d3.format(".0%")(num);
                    }
                    else
                    {
                        return String(FormatUtils.defaultNumberFormatting(num));
                    }
                }
            }
        };
    }

	public get deprecatedStateMapping():Object
	{
		return [super.deprecatedStateMapping, {
			"children": {
				"visualization": {
					"plotManager": {
						"plotters": {
							"plot": {
								"filteredKeySet": this.filteredKeySet,
								"heightColumns": this.heightColumns,
								"labelColumn": this.labelColumn,
								"sortColumn": this.sortColumn,
								"colorColumn": this.colorColumn,
								"chartColors": this.chartColors,
								"horizontalMode": this.horizontalMode,
								"showValueLabels": this.showValueLabels,
								"groupingMode": this.groupingMode
							}
						}
					}
				}
			}
		}];
	}

    private dataChanged():void
	{
		var columns = this.heightColumns.getObjects();
		this.RECORD_FORMAT.heights = _.zipObject(this.heightColumns.getNames(), columns) as any;
		this.RECORD_FORMAT.heights.xLabel = this.labelColumn;
		this.RECORD_DATATYPE.heights = _.zipObject(this.heightColumns.getNames(), columns.map(() => Number)) as any;
		this.RECORD_DATATYPE.heights.xLabel = String;
		
        this.heightColumnNames = this.heightColumns.getNames();
        this.heightColumnsLabels = columns.map((column:IAttributeColumn) => {
            return column.getMetadata("title");
        });

        this.yLabelColumnDataType = this.yLabelColumn.getMetadata("dataType");

        this.records = weavejs.data.ColumnUtils.getRecords(this.RECORD_FORMAT, this.filteredKeySet.keys, this.RECORD_DATATYPE);
        this.records = _.sortByOrder(this.records, ["numericValues.sort"], ["asc"]);

        if (weavejs.WeaveAPI.Locale.reverseLayout)
        {
            this.records = this.records.reverse();
        }

        if (this.groupingMode.value === STACK || this.groupingMode.value === PERCENT_STACK)
            this.c3Config.data.groups = [this.heightColumnNames];
        else //if(this.groupingMode === "group")
            this.c3Config.data.groups = [];

        if (this.groupingMode.value === PERCENT_STACK && this.heightColumnNames.length > 1)
        {
            // normalize the height columns to be percentages.
			for (var record of this.records)
			{
				var heights = record.heights;
				var sum:number = 0;
				for (let key in heights)
					if (typeof heights[key] == "number")
						sum += heights[key];
				for (let key in heights)
					if (typeof heights[key] == "number")
						heights[key] /= sum;
			}
        }

        var keys = {
			x: "", 
			value: new Array<string>()
		};
        
		// if label column is specified
        if (this.labelColumn.target)
        {
            keys.x = "xLabel";
            this.c3Config.legend.show = false;
        }
        else
        {
            this.c3Config.legend.show = true;
        }

        keys.value = this.heightColumnNames;
        var columnColors:{[name:string]: string} = {};
        var columnTitles:{[name:string]: string} = {};

        if (this.heightColumnNames.length > 1)
        {
            this.heightColumnNames.forEach((name, index) => {
                var color = this.chartColors.getColorFromNorm(index / (this.heightColumnNames.length - 1));
                columnColors[name] = "#" + weavejs.util.StandardLib.numberToBase(color, 16, 6);;
                columnTitles[name] = this.heightColumnsLabels[index];
            });
            if (this.labelColumn.target)
            {
                this.c3Config.legend.show = true;
            }
        }
        else
        {
            this.c3Config.legend.show = false;
        }

		// any reason to cloneDeep here?
        var data:c3.Data = _.cloneDeep(this.c3Config.data);
		
        data.json = _.pluck(this.records, 'heights');
        
		//need other stuff for data.json to work
		//this can potentially override column names
		//c3 limitation

        data.colors = columnColors;
        data.keys = keys;
        data.names = columnTitles;
        data.unload = true;
        this.c3Config.data = data;
    }

    updateStyle()
    {
    	if (!this.chart || !this.heightColumnNames)
    		return;

		let selectionEmpty: boolean = !this.selectionKeySet || this.selectionKeySet.keys.length === 0;

        d3.select(this.element)
        	.selectAll("path")
        	.style("opacity", 1)
            .style("stroke", "black")
            .style("stroke-width", 1.0)
            .style("stroke-opacity", 0.5);

		d3.select(this.element)
			.selectAll("g")
			.selectAll("text")
			.style("fill-opacity", 1.0);

        var selectedKeys:IQualifiedKey[] = this.selectionKeySet.keys;
		var keyToIndex = weavejs.util.ArrayUtils.createLookup(this.records, "id");

        var selectedIndices:number[] = selectedKeys.map((key:IQualifiedKey) => {
			return Number(keyToIndex.get(key));
        });

        this.heightColumnNames.forEach((item:string) => {
			d3.select(this.element).selectAll("g").filter(".c3-shapes-"+item+".c3-bars").selectAll("path")
				.style("opacity",
				(d: any, i: number, oi: number): number => {
					let key = this.records[i].id;
					let selected = this.isSelected(key);
					let probed = this.isProbed(key);
					return (selectionEmpty || selected || probed) ? 1.0 : 0.3;
				})
				.style("stroke-opacity",
					(d: any, i: number, oi: number): number => {
						let key = this.records[i].id;
						let selected = this.isSelected(key);
						let probed = this.isProbed(key);
						if (probed)
							return 1.0;
						if (selected)
							return 0.7;
						return 0.5;
					});
				//Todo: find better probed style to differentiate bars
				//.style("stroke-width",
				//	(d: any, i: number, oi: number): number => {
				//		let key = this.records[i].id;
				//		let probed = this.isProbed(key);
				//		return probed ? 1.5 : 1.0;
				//	});

			d3.select(this.element).selectAll("g").filter(".c3-texts-"+item).selectAll("text")
				.style("fill-opacity",
				(d: any, i: number, oi: number): number => {
					let key = this.records[i].id;
					let selected = this.isSelected(key);
					let probed = this.isProbed(key);
					return (selectionEmpty || selected || probed) ? 1.0 : 0.3;
				});
        });
		if (selectedIndices.length)
			this.chart.select(this.heightColumnNames, selectedIndices, true);
		else if(!this.probeKeySet.keys.length)
			this.chart.select(this.heightColumnNames, [], true);
    }

    validate(forced:boolean = false):void
    {
        if (this.busy)
        {
            this.dirty = true;
            return;
        }
        this.dirty = false;

        var changeDetected:boolean = false;
        var axisChange:boolean = Weave.detectChange(this, this.heightColumns,
														  this.labelColumn,
														  this.sortColumn,
														  this.margin.bottom,
														  this.margin.top,
														  this.margin.left,
														  this.margin.right,
														  this.overrideBounds,
														  this.overrideBounds);
        var axisSettingsChange:boolean = Weave.detectChange(this, this.xAxisName, this.yAxisName);
        if (axisChange || Weave.detectChange(this, this.colorColumn, this.chartColors, this.groupingMode, this.filteredKeySet))
        {
            changeDetected = true;
            this.dataChanged();
        }
        
		if (axisChange)
        {
            changeDetected = true;
			
            var xLabel:string = this.xAxisName.value || "Sorted by " + this.sortColumn.getMetadata('title');
            var yLabel:string = this.yAxisName.value || (this.heightColumnsLabels ? this.heightColumnsLabels.join(", ") : "");

            if (!this.showXAxisLabel.value)
            {
                xLabel = " ";
            }

            if (this.heightColumnNames && this.heightColumnNames.length)
            {
                var temp:any =  {};
                if (weavejs.WeaveAPI.Locale.reverseLayout)
                {
                    this.heightColumnNames.forEach( (name) => {
                        temp[name] = 'y2';
                    });
                    this.c3Config.data.axes = temp;
                    this.c3Config.axis.y2 = this.c3ConfigYAxis;
                    this.c3Config.axis.y = {show: false};
                    this.c3Config.axis.x.tick.rotate = 45;
                }
                else
                {
                    this.heightColumnNames.forEach( (name) => {
                        temp[name] = 'y';
                    });
                    this.c3Config.data.axes = temp;
                    this.c3Config.axis.y = this.c3ConfigYAxis;
                    delete this.c3Config.axis.y2;
                    this.c3Config.axis.x.tick.rotate = -45;
                }
            }

            this.c3Config.axis.x.label = {text:xLabel, position:"outer-center"};
            this.c3ConfigYAxis.label = {text:yLabel, position:"outer-middle"};

        }
		
		this.updateConfigMargin();
		this.updateConfigAxisY();
		
        if (Weave.detectChange(this, this.horizontalMode))
        {
            changeDetected = true;
            this.c3Config.axis.rotated = this.horizontalMode.value;
        }

        if (changeDetected || forced)
        {
            this.busy = true;
            this.chart = c3.generate(this.c3Config);
            this.cullAxes();
        }
    }
}

Weave.registerClass("weavejs.tool.C3BarChart", C3BarChart, [weavejs.api.ui.IVisTool, weavejs.api.core.ILinkableObjectWithNewProperties]);
Weave.registerClass("weave.visualization.tools::CompoundBarChartTool", C3BarChart);
