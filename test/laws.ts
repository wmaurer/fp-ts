import * as assert from 'assert'
import {
  checkLaws,
  getSemigroupLaws,
  getMonoidLaws,
  getMonadLaws,
  getApplicativeLaws,
  getApplyLaws,
  getChainLaws,
  getSetoidLaws,
  getOrdLaws,
  getSemiringLaws,
  getRingLaws,
  getFieldLaws,
  getFunctorLaws
} from '../src/laws'
import { gen, Generator } from 'testcheck'
import { setoidNumber, setoidString, setoidBoolean } from '../src/Setoid'
import { ordNumber } from '../src/Ord'
import { fieldInteger, fieldNumber } from '../src/Field'
import { Option, option, getSetoid, getMonoid } from '../src/Option'
import { monoidSum, monoidString } from '../src/Monoid'

const NumberGenerator: Generator<number> = gen.number.suchThat(n => n !== Infinity && n !== -Infinity && !isNaN(n))
const IntegerGenerator: Generator<number> = gen.int
const OptionStringGenerator: Generator<Option<string>> = gen.string.then(n => option.of(n))
const agenerator = gen.string
const fagenerator = OptionStringGenerator
const SFA = getSetoid(setoidString)
const SFC = getSetoid(setoidBoolean)
const SFB = getSetoid(setoidNumber)
const ab = (a: string) => a.length
const bc = (b: number) => b >= 2
const fab = option.of(ab)
const fbc = option.of(bc)
const afb = (a: string) => option.of(ab(a))
const bfc = (b: number) => option.of(bc(b))

describe('laws', () => {
  it('getSemigroupLaws', () => {
    const S = getMonoid(monoidString)
    assert.notDeepEqual(checkLaws(getSemigroupLaws(S, OptionStringGenerator, SFA)).getOrElse(['KO']), ['KO'])
  })

  it('getMonoidLaws', () => {
    assert.notDeepEqual(checkLaws(getMonoidLaws(monoidSum, IntegerGenerator, setoidNumber)).getOrElse(['KO']), ['KO'])
  })

  it('getApplicativeLaws', () => {
    assert.notDeepEqual(checkLaws(getApplicativeLaws(option)(agenerator, SFA, SFC, SFB)(ab, bc)).getOrElse(['KO']), [
      'ok'
    ])
  })

  it('getApplyLaws', () => {
    assert.notDeepEqual(checkLaws(getApplyLaws(option)(fagenerator, SFA, SFC)(ab, bc, fab, fbc)).getOrElse(['KO']), [
      'ok'
    ])
  })

  it('getChainLaws', () => {
    assert.notDeepEqual(
      checkLaws(getChainLaws(option)(fagenerator, SFA, SFC)(ab, bc, fab, fbc, afb, bfc)).getOrElse(['KO']),
      ['KO']
    )
  })

  it('getFieldLaws', () => {
    assert.notDeepEqual(checkLaws(getFieldLaws(fieldInteger, IntegerGenerator, setoidNumber)).getOrElse(['KO']), ['KO'])
  })

  it('getFunctorLaws', () => {
    assert.notDeepEqual(checkLaws(getFunctorLaws(option)(fagenerator, SFA, SFC)(ab, bc)).getOrElse(['KO']), ['KO'])
  })

  it('getMonadLaws', () => {
    assert.notDeepEqual(checkLaws(getMonadLaws(option)(agenerator, SFA, SFC, SFB)(ab, bc)).getOrElse(['KO']), ['KO'])
  })

  it('getOrdLaws', () => {
    assert.notDeepEqual(checkLaws(getOrdLaws(ordNumber, NumberGenerator, setoidNumber)).getOrElse(['KO']), ['KO'])
  })

  it('getRingLaws', () => {
    assert.notDeepEqual(checkLaws(getRingLaws(fieldNumber, IntegerGenerator, setoidNumber)).getOrElse(['KO']), ['KO'])
  })

  it('getSemiringLaws', () => {
    assert.notDeepEqual(checkLaws(getSemiringLaws(fieldNumber, IntegerGenerator, setoidNumber)).getOrElse(['KO']), [
      'ok'
    ])
  })

  it('getSetoidLaws', () => {
    assert.notDeepEqual(checkLaws(getSetoidLaws(setoidNumber, NumberGenerator)).getOrElse(['KO']), ['KO'])
  })
})
