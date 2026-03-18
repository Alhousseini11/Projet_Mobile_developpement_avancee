const webpack = require("@nativescript/webpack");

function toArray(value) {
	if (!value) {
		return [];
	}

	return Array.isArray(value) ? value : [value];
}

function normalizeIgnoredEntries(entries) {
	return entries.filter((entry) => typeof entry === "string" && entry.length > 0);
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

	return config;
};
