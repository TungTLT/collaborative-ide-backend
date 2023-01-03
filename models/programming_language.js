class Version {
    constructor(name, index) {
        this.name = name
        this.index = index
    }
}

class ProgrammingLanguage {
    constructor(name, languageCode, versions, template) {
        this.name = name
        this.languageCode = languageCode
        this.versions = versions
        this.template = template
    }

    toMap() {
        return {
            'name': this.name,
            'languageCode': this.languageCode,
            'versions': this.versions.map((element) => element.name),
            'template': this.template
        }
    }
}

module.exports = {
    Version, ProgrammingLanguage
}