/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
	extensionsToTreatAsEsm: [".ts"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
