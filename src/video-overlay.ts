export default class VideoOverlay {
	private dom: {
		parent: HTMLElement;
		container: HTMLDivElement;
		video: HTMLVideoElement;
	};
	private onClose?: () => {};

	constructor(parent: HTMLElement, onClose?: () => {}) {
		this.onClose = onClose;

		this.dom = {
			parent,
			container: document.createElement("div"),
			video: document.createElement("video"),
		};

		this.dom.container.classList.add("video-overlay");
		this.dom.container.append(this.dom.video);

		this.dom.video.controls = true;
		this.dom.parent.append(this.dom.container);
	}

	public open(videoUrl: string) {
		this.dom.container.classList.toggle("active", true);
		this.dom.video.src = videoUrl;

		const handleClose = (event: KeyboardEvent) => {
			if (event.key !== "Escape" && event.code !== "Escape") return;

			this.dom.container.classList.toggle("active", false);
			this.dom.video.pause();
			this.onClose?.();
			document.removeEventListener("keydown", handleClose);
		};
		document.addEventListener("keydown", handleClose);
	}
}
