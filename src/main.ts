import "./style.css";
import Flipbook from "./flipbook";

declare global {
	interface Window {
		flipbook: Flipbook;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const containerEl = document.getElementById("flipbook-container");

	if (containerEl) {
		window.flipbook = new Flipbook({
			containerEl,
			textureUrls: {
				// pages: [
				// 	"https://picsum.photos/id/110/457/736",
				// 	"/img/page2.jpg",
				// 	"/img/line.png",
				// 	"/img/page.jpg",
				// 	"/img/page2.jpg",
				// 	"https://picsum.photos/id/123/445/720",
				// 	"https://picsum.photos/id/124/445/720",
				// 	"https://picsum.photos/id/125/445/720",
				// 	"https://picsum.photos/id/126/445/720",
				// 	"https://picsum.photos/id/127/445/720",
				// 	"https://picsum.photos/id/128/445/720",
				// 	"https://picsum.photos/id/129/445/720",
				// 	"https://picsum.photos/id/130/445/720",
				// 	"https://picsum.photos/id/131/445/720",
				// 	"https://picsum.photos/id/132/445/720",
				// 	"https://picsum.photos/id/133/445/720",
				// 	"https://picsum.photos/id/134/445/720",
				// 	"https://picsum.photos/id/135/445/720",
				// 	"https://picsum.photos/id/136/445/720",
				// 	"https://picsum.photos/id/139/445/720",
				// ],
				pages: [
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
					"/img/0.7.jpg",
				],
				// pages: [
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// 	"/img/0.77.jpg",
				// ],
				spineInner: "https://picsum.photos/id/140/445/720",
				spineOuter: "https://picsum.photos/id/140/445/720",
				coverEdgeTB: "/img/edgeRainbow.png",
				coverEdgeLR: "/img/edgeRainbow.png",
				spineEdgeTB: "/img/edgeRainbow.png",
				spineEdgeLR: "/img/edgeRainbow.png",
			},
			pageEdgeColor: 0xdddddd,
			// pageWidth: 445,
			// pageHeight: 720,
			pageWidth: 764,
			pageHeight: 1080,
			// pageWidth: 832,
			// pageHeight: 1080,
			coverThickness: 5,
			pageRootThickness: 5,
			pageThickness: 2,
			coverMarginX: 8,
			coverMarginY: 10,
		});
	} else {
		console.error("No container element found");
	}
});
