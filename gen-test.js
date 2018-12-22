let adjectives = require('./adjectives')
let nouns = require('./nouns')
let verbs = require('./verbs')

function coinFlip() {
  return (Math.floor(Math.random() * 2) == 0);
}

function generateDraws() {

  for (let i = 0; i < 6; i++) {
    let randAdv = Math.floor(Math.random() * adjectives.en.length)
    let randNoun1 = Math.floor(Math.random() * nouns.en.length)
    let randNoun2 = Math.floor(Math.random() * nouns.en.length)
    let randVerb = Math.floor(Math.random() * verbs.en.length)

    if (coinFlip()) {
      console.log({
        en: `Draw ${adjectives.en[randAdv]} ${nouns.en[randNoun1]}`,
        es: `Dibujar ${adjectives.es[randAdv]} ${nouns.es[randNoun1]}`
      })
    } else {
      console.log({
        en: `Draw a ${nouns.en[randNoun2]} that will ${verbs.en[randVerb]}`,
        es: `Dibujar un ${nouns.es[randNoun2]} que va a ${verbs.es[randVerb]}`,
      })
    }

  }
}

generateDraws()
