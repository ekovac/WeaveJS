import * as React from "react";
import MenuBar from "./react-ui/MenuBar";
import MiscUtils from "./utils/MiscUtils";
import * as FileSaver from "filesaver.js";
import FileInput from "./react-ui/FileInput";
import PopupWindow from "./react-ui/PopupWindow";

export interface WeaveMenuBarProps extends React.Props<WeaveMenuBar> {
	weave:Weave
}

export interface WeaveMenuBarState {
	
}

function weaveMenu(weave:Weave)
{
    return {
		label: "Weave",
		bold: true,
		menu: [
			{
				label: "Preferences...",
				click: () => {}
			},
			{
				label: "Edit Session State",
				click: () => {},
				menu: [
					{
						label: "Nested",
						click: () => { console.log("I'm a child") }
					}
				]
			},
			{
			},
			{
				label: "Report a problem",
				click: () => {},
				disabled: true
			},
			{
				label: "Visit iWeave.com",
				click: () => {}
			},
			{
				label: "Visit Weave Wiki",
				click: () => {}
			},
			{
			},
			{
				label: "Version: 2.0",
				click: () => {}
			}, 
			{
			},
			{
				label: "Restart",
				click: () => {}
			}
		]
	};
}

function fileMenu(weave:Weave)
{

    function openFile(e:any) {
        const selectedfile:File = e.target.files[0];
        new Promise(function (resolve:any, reject:any) {
                let reader:FileReader = new FileReader();
                reader.onload = function (event:Event) {
                    resolve([event, selectedfile]);
                };
                reader.readAsArrayBuffer(selectedfile);
            })
            .then(function (zippedResults:any) {
                var e:any = zippedResults[0];
                var result:any = e.target.result;
                weavejs.core.WeaveArchive.loadFileContent(weave,result);
            });
    }
    
    function saveFile()
	{
		PopupWindow.open({
			title: "Save file dialog",
			content: <div>I am a save file dialog</div>,
			modal: true
		});
        // var archive:any  = weavejs.core.WeaveArchive.createArchive(weave)
        // var uint8Array:any = archive.serialize();
        // var arrayBuffer:any  = uint8Array.buffer;
		// FileSaver.saveAs(new Blob([arrayBuffer]), "test.weave");
  	}

	function exoprtCSV()
	{
		PopupWindow.open({
			title: "Export CSV",
			content: <div style={{width: 300, height: 300}}>I am a save file dialog</div>,
			modal: false
		});
		// var archive:any  = weavejs.core.WeaveArchive.createArchive(weave)
		// var uint8Array:any = archive.serialize();
		// var arrayBuffer:any  = uint8Array.buffer;
		// FileSaver.saveAs(new Blob([arrayBuffer]), "test.weave");
	}

    return {
		label: "File",
		onClick: "",
		menu: [
			{
				label: <FileInput onChange={openFile}>Open a file...</FileInput>
			},
			{
				label: Weave.lang("Save as..."),
				click: saveFile
			},
			{
				label: "Export CSV",
				click: exoprtCSV
			}
		]
	};
}

function dataMenu(weave:Weave) 
{
	return {
		label: "Data",
		menu: [
			{
				label: "Manage or browse data",
				click: () => { console.log("Manage or browse data") }
			},
			{
			},
			{
				label: "Add CSV DataSource",
				click: () => { console.log("Add CSV DataSource") }
			}
		]
	};
}

export default class WeaveMenuBar extends React.Component<WeaveMenuBarProps, WeaveMenuBarState>
{
	constructor(props:WeaveMenuBarProps)
	{
		super(props);
	}
	
	render():JSX.Element
	{
        var weave = this.props.weave;
		return (
			<MenuBar style={{width: "100%"}} config={[weaveMenu(weave), fileMenu(weave), dataMenu(weave)]}/>
		)
	}
}
