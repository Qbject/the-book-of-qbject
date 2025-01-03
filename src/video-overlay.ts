export default class VideoOverlay {
	private dom: {
		parent: HTMLElement;
		container: HTMLDivElement;
		backdrop: HTMLDivElement;
		closeBtn: HTMLButtonElement;
		videos: Record<string, HTMLVideoElement>;
	};
	private onClose?: () => {};
	private activeVideo: HTMLVideoElement | null = null;

	constructor(parent: HTMLElement, onClose?: () => {}) {
		this.onClose = onClose;

		this.dom = {
			parent,
			container: document.createElement("div"),
			backdrop: document.createElement("div"),
			closeBtn: document.createElement("button"),
			videos: {},
		};

		this.dom.container.classList.add("video-overlay");
		this.dom.backdrop.classList.add("backdrop");
		this.dom.closeBtn.classList.add("closeBtn");

		this.dom.container.append(this.dom.backdrop);
		this.dom.container.append(this.dom.closeBtn);
		this.dom.parent.append(this.dom.container);

		this.dom.backdrop.addEventListener("click", () => this.close());
		this.dom.closeBtn.addEventListener("click", () => this.close());
	}

	public open(videoUrl: string) {
		this.addVideo(videoUrl);
		this.dom.container.classList.toggle("active", true);
		this.activeVideo = this.dom.videos[videoUrl];
		this.activeVideo.classList.toggle("active", true);
		this.activeVideo.currentTime = 0;
		this.activeVideo.play();

		document.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key !== "Escape" && event.code !== "Escape") return;
			this.close();
		});
	}

	private close() {
		if (!this.activeVideo) return;

		this.dom.container.classList.toggle("active", false);
		this.activeVideo.classList.toggle("active", false);
		this.activeVideo.pause();
		this.activeVideo = null;

		this.onClose?.();
	}

	public addVideo(src?: string) {
		if (!src || this.dom.videos[src]) return;

		const video = (this.dom.videos[src] = document.createElement("video"));
		this.dom.container.append(video);

		video.src = src;
		video.controls = true;
		video.setAttribute("controlslist", "nodownload noremoteplayback");
		video.setAttribute("disablepictureinpicture", "");
		video.setAttribute("disableremoteplayback", "");
		video.preload = "metadata";
	}
}
