const webpack = require("@nativescript/webpack");
const { DefinePlugin } = require("webpack");

function toArray(value) {
	if (!value) {
		return [];
	}

	return Array.isArray(value) ? value : [value];
}

function normalizeIgnoredEntries(entries) {
	return entries.filter((entry) => typeof entry === "string" && entry.length > 0);
}

function readBuildTimeEnv(name) {
	const value = process.env[name];

	return typeof value === "string" ? value.trim() : "";
}

module.exports = (env) => {
	webpack.init(env);

	// Learn how to customize:
	// https://docs.nativescript.org/webpack

	const config = webpack.resolveConfig();
	const ignored = normalizeIgnoredEntries(toArray(config.watchOptions?.ignored));

	config.watchOptions = {
		...(config.watchOptions || {}),
		ignored: [
			...ignored,
			"**/pagefile.sys",
			"**/swapfile.sys",
			"**/hiberfil.sys",
			"**/$Recycle.Bin/**",
			"**/System Volume Information/**",
		],
	};

	config.plugins = [
		...(config.plugins || []),
		new DefinePlugin({
			__NS_API_BASE_URL__: JSON.stringify(readBuildTimeEnv("NS_API_BASE_URL")),
		}),
	];

	return config;
};
