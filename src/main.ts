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
			textures: {
				pages: [
					"https://picsum.photos/id/110/445/720",
					"https://picsum.photos/id/111/445/720",
					// "https://picsum.photos/id/120/445/720",
					"/img/line.png",
					"https://picsum.photos/id/121/445/720",
					"https://picsum.photos/id/122/445/720",
					"https://picsum.photos/id/123/445/720",
					"https://picsum.photos/id/124/445/720",
					"https://picsum.photos/id/125/445/720",
					"https://picsum.photos/id/126/445/720",
					"https://picsum.photos/id/127/445/720",
					"https://picsum.photos/id/128/445/720",
					"https://picsum.photos/id/129/445/720",
					"https://picsum.photos/id/130/445/720",
					"https://picsum.photos/id/131/445/720",
					"https://picsum.photos/id/132/445/720",
					"https://picsum.photos/id/133/445/720",
					"https://picsum.photos/id/134/445/720",
					"https://picsum.photos/id/135/445/720",
					"https://picsum.photos/id/136/445/720",
					"https://picsum.photos/id/139/445/720",
				],
				spineInner: "https://picsum.photos/id/236/32/32",
				spineOuter: "https://picsum.photos/id/236/32/32",
				coverEdgeTB: "https://picsum.photos/id/236/32/32",
				coverEdgeLR: "https://picsum.photos/id/236/32/32",
				spineEdgeTB: "https://picsum.photos/id/236/32/32",
				spineEdgeLR: "https://picsum.photos/id/236/32/32",
			},
			pageWidth: 445,
			pageHeight: 720,
			coverThickness: 5,
		});
	} else {
		console.error("No container element found");
	}
});
