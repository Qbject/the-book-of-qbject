type PageParams = {
	frontUrl: string;
	backUrl: string;
	width: number;
	height: number;
	thickness?: number;
	rootThickness?: number;
	isCover?: boolean;
};

type PageControlPointParams = {
	turnProgress: number;
	distance: number;
};

type PageControlPoint = {
	x: number;
	z: number;
};

type FlipBookParams = {
	containerEl: HTMLElement;
	pageWidth: number;
	pageHeight: number;
	pageThickness?: number;
	pageRootThickness?: number;
	coverThickness?: number;
	coverMargin?: number;
	textures: {
		pages: string[];
		spineInner: string;
		spineOuter: string;
		coverEdgeTB: string;
		coverEdgeLR: string;
		spineEdgeTB: string;
		spineEdgeLR: string;
	};
};

type FlipBookTextures = {
	spineEdgeLR?: ThreeMFLoader.Texture;
	spineEdgeTB?: ThreeMFLoader.Texture;
	spineInner?: ThreeMFLoader.Texture;
	spineOuter?: ThreeMFLoader.Texture;
};
