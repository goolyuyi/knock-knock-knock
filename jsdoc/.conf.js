module.exports = {
    "tags": {
        "allowUnknownTags": true,
        // "dictionaries": ["jsdoc"]
    },
    "source": {
        "include": ["knock-knock/", "knock-knock/package.json"],
        "includePattern": ".js$",
        "excludePattern": "(node_modules/|test/|doc/)"
    },
    "plugins": [
        "plugins/markdown",

    ],
    "templates": {
        "cleverLinks": false,
        "monospaceLinks": true,
        "useLongnameInNav": false,
        "showInheritedInNav": true
    },
    "opts": {
        "destination": "./dist-doc/",
        "encoding": "utf8",
        // "private": true,
        // "recurse": true,
        "template": "./node_modules/minami"
    }
}
