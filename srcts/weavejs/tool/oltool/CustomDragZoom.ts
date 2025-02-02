namespace weavejs.tool.oltool
{
	export class CustomDragZoom extends ol.interaction.DragBox
	{
		constructor()
		{
			super({});
			this.on('boxstart', CustomDragZoom.prototype.onBoxStart, this);
			this.on('boxend', CustomDragZoom.prototype.onBoxEnd, this);
		}

		private _probeInteraction: ProbeInteraction;

		private get probeInteraction(): ProbeInteraction {
			if (!this._probeInteraction) {
				for (let interaction of this.getMap().getInteractions().getArray()) {
					if (interaction instanceof ProbeInteraction) {
						this._probeInteraction = interaction as ProbeInteraction;
						break;
					}
				}
			}

			return this._probeInteraction;
		}

		onBoxStart(event: any)
		{
			if (this.probeInteraction)
				this.probeInteraction.setActive(false);
		}

		onBoxEnd(event: any)
		{
			if (this.probeInteraction)
				this.probeInteraction.setActive(true);

			let extent: ol.Extent = this.getGeometry().getExtent();
			let view: ol.View = this.getMap().getView();
			let size: ol.Size = this.getMap().getSize();
			view.fit(this.getGeometry(), size, {constrainResolution: false});
		}
	}
}
