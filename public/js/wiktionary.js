const Dictionary = {
  name: 'wiktionary',
  file: undefined,
  dictionary: undefined,
  words: [],
  index: {},
  cache: {},
  tables: [],
  l1: undefined,
  l2: undefined,
  loadWords() {
    return new Promise(resolve => {
      console.log('Wiktionary: Loading words')
      let xhttp = new XMLHttpRequest()
      let that = this
      xhttp.onload = function() {
        if (this.readyState == 4 && (this.status >= 200 && this.status < 400)) {
          that.words = that.parseDictionary(this.responseText)
          resolve()
        }
      }
      xhttp.open('GET', this.file, true)
      xhttp.send()
    })
  },
  parseDictionary(json) {
    this.dictionary = JSON.parse(json)
    let words = []
    for(let item of this.dictionary) {
      if (item.word && !item.redirect) {
        let definitions = []
        if (item.senses && item.senses[0]) {
          for (let sense of item.senses) {
            if (sense.glosses) {
              if (sense.complex_inflection_of) {
                for (let inflection of sense.complex_inflection_of) {
                  let head = inflection['1'] || inflection['2']
                  if (head) {
                    definitions.push(`${inflection['3']} ${inflection['4']} ${inflection['5']} inflection of <a href="https://en.wiktionary.org/wiki/${head}" target="_blank">${head}</a>`)
                  }
                }
              } else {
                definitions.push(sense.glosses[0])
              }
            }
          }
        }
        if (definitions.length === 0) {
          definitions.push(`(inflected form, see <a href="https://en.wiktionary.org/wiki/${item.word}" target="_blank">Wiktionary</a> for details)`)
        }
        words.push(Object.assign(item, {
          bare: item.word,
          head: item.word,
          accented: item.word,
          pronunciation: item.pronunciations && item.pronunciations[0].ipa ? item.pronunciations[0].ipa[0][1].replace(/\//g, '') : undefined,
          definitions: definitions,
          pos: item.pos
        }))
      }
    }
    words = words.sort((a, b) => {
      if (a.head && b.head) {
        return a.head.length - b.head.length
      }
    })
    words = words.map((word, index) => {
      word.id = index
      return word
    })
    return words
  },
  dictionaryFile(options) {
    let l2 = options.l2.replace('nor', 'nob') // Default Norwegian to Bokmål
      .replace('hrv', 'hbs') // Serbian uses Serbo-Croatian
      .replace('srp', 'hbs') // Croatian uses Serbo-Croatian
    let filename = `/data/wiktionary/${l2}-${options.l1}.json.txt`
    if (['fin', 'fra', 'hbs', 'ita', 'lat', 'por', 'spa'].includes(l2)) {
      filename = `/data/wiktionary/large/${l2}-${options.l1}.json.txt`
    }
    return filename
  },
  load(options) {
    console.log('Loading Wiktionary...')
    this.l1 = options.l1
    this.l2 = options.l2
    this.file = this.dictionaryFile(options)
    return new Promise(async resolve => {
      let promises = [this.loadWords()]
      await Promise.all(promises)
      resolve(this)
    })
  },
  get(id) {
    return this.words[id]
  },
  lookup(text) {
    let word = this.words.find(word => word && word.bare.toLowerCase() === text.toLowerCase())
    return word
  },
  formTable() {
    return this.tables
  },
  stylize(name) {
    return name
  },
  wordForms(word) {
    let forms = [{
      table: 'head',
      field: 'head',
      form: word.bare
    }]
    return forms
  },
  lookupByDef(text, limit = 30) {
    text = text.toLowerCase()
    let words = this.words
      .filter(word => word.definitions && word.definitions.join(', ').includes(text))
      .slice(0, limit)
    return words
  },
  uniqueByValue(array, key) {
    let flags = []
    let unique = []
    let l = array.length
    for(let i = 0; i<l; i++) {
      if( flags[array[i][key]]) continue
      flags[array[i][key]] = true
      unique.push(array[i])
    }
    return unique
  },
  lookupFuzzy(text, limit = 30) { // text = 'abcde'
    text = text.toLowerCase()
    let subtexts = []
    for (let i = 1; i < text.length; i++) {
      subtexts.push(text.substring(0, text.length - i))
    }
    let words = this.words
      .filter(word => word.head && word.head.startsWith(text)) // matches 'abcde', 'abcde...'
      .slice(0, limit)
      .sort((a, b) => a.head.length - b.head.length)
    let moreWords = []
    for (let subtext of subtexts) {
      if (moreWords.length < limit) {
        moreWords = moreWords.concat(this.words.filter(word => word.head.startsWith(subtext)))// matches 'abcd...', 'abc...'
      }
    }
    return this.uniqueByValue(words.concat(moreWords), 'head')
  },
  randomArrayItem(array, start = 0, length = false) {
    length = length || array.length
    array = array.slice(start, length)
    let index = Math.floor(Math.random() * array.length)
    return array[index]
  },
  //https://stackoverflow.com/questions/2532218/pick-random-property-from-a-javascript-object
  randomProperty(obj) {
    var keys = Object.keys(obj)
    return obj[keys[(keys.length * Math.random()) << 0]]
  },
  random() {
    return this.randomProperty(this.words)
  },
  accent(text) {
    return text.replace(/'/g, '́')
  }
}
  