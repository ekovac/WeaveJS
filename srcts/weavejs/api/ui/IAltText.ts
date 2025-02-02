namespace weavejs.api.ui
{
	import LinkableString = weavejs.core.LinkableString;
	import LinkableBoolean = weavejs.core.LinkableBoolean;

	export class IAltTextConfig
	{
		text = Weave.linkableChild(this, LinkableString);
		showAsCaption = Weave.linkableChild(this, new LinkableBoolean(false));
	}
	Weave.registerClass(IAltTextConfig, "weavejs.api.ui.IAltTextConfig");

	export class IAltText
	{
		altText = Weave.linkableChild(this, IAltTextConfig);
		getAutomaticDescription:()=>string;
	}
	Weave.registerClass(IAltText, "weavejs.api.ui.IAltText");
}
