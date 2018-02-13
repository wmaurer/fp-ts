import { check, Property, Generator, property, CheckOptions } from 'testcheck'
import { Setoid } from './Setoid'
import { Ord } from './Ord'
import { Semiring } from './Semiring'
import { Ring } from './Ring'
import { Field } from './Field'
import { HKT, URIS, Type } from './HKT'
import { Functor, Functor1 } from './Functor'
import { identity, compose } from './function'
import { Either, right, left, either } from './Either'
import { sequence } from './Traversable'
import { array } from './Array'
import { Apply, Apply1 } from './Apply'
import { Applicative, Applicative1 } from './Applicative'
import { Chain, Chain1 } from './Chain'
import { Monad, Monad1 } from './Monad'
import { Semigroup } from './Semigroup'
import { Monoid } from './Monoid'

export class Law<A> {
  constructor(readonly name: string, readonly property: Property<A>) {}
  check(options?: CheckOptions): Either<string, string> {
    const name = this.name
    const c = check(this.property, options)
    if (c.result) {
      return right(name)
    } else {
      return left(`Law "${name}" failed with the following case: ${JSON.stringify(c, null, 2)}`)
    }
  }
}

export type Laws = Array<Law<any>>

export function getFunctionEquality<A, B>(
  gen: Generator<A>,
  S: Setoid<B>
): (f: (a: A) => B, g: (a: A) => B) => Property<A> {
  return (f, g) =>
    property(gen, a => {
      return S.equals(f(a), g(a))
    })
}

const sequenceEithers = sequence(either, array)

export function checkLaws(laws: Laws, options?: CheckOptions): Either<string, Array<string>> {
  return sequenceEithers(laws.map(l => l.check(options)))
}

export function getSetoidLaws<A>(E: Setoid<A>, gen: Generator<A>): Laws {
  return [
    new Law(
      'Setoid: Reflexivity',
      property(gen, a => {
        return E.equals(a, a)
      })
    ),
    new Law(
      'Setoid: Symmetry',
      property(gen, gen, (a, b) => {
        return E.equals(a, b) ? E.equals(b, a) : true
      })
    ),
    new Law(
      'Setoid: Transitivity',
      property(gen, gen, gen, (a, b, c) => {
        return E.equals(a, b) && E.equals(b, c) ? E.equals(a, c) : true
      })
    )
  ]
}

export function getOrdLaws<A>(O: Ord<A>, gen: Generator<A>, E: Setoid<A>): Laws {
  return [
    new Law(
      'Ord: Compatibility with Setoid',
      property(gen, gen, (a, b) => {
        return O.compare(a, b) === 0 ? E.equals(a, b) : true
      })
    ),
    new Law(
      'Ord: Reflexivity',
      property(gen, a => {
        return O.compare(a, a) !== 1
      })
    ),
    new Law(
      'Ord: Antisymmetry',
      property(gen, gen, (a, b) => {
        return O.compare(a, b) !== 1 && O.compare(b, a) !== 1 ? E.equals(a, b) : true
      })
    ),
    new Law(
      'Ord: Transitivity',
      property(gen, gen, gen, (a, b, c) => {
        return O.compare(a, b) !== 1 && O.compare(b, c) !== 1 ? O.compare(a, c) !== 1 : true
      })
    )
  ]
}

export function getSemigroupLaws<A>(S: Semigroup<A>, gen: Generator<A>, E: Setoid<A>): Laws {
  return [
    new Law(
      'Semigroup: Associativity',
      property(gen, gen, gen, (a, b, c) => {
        return E.equals(S.concat(S.concat(a, b), c), S.concat(a, S.concat(b, c)))
      })
    )
  ]
}

export function getMonoidLaws<A>(M: Monoid<A>, gen: Generator<A>, E: Setoid<A>): Laws {
  const empty = M.empty
  return getSemigroupLaws(M, gen, E).concat([
    new Law(
      'Monoid: Left identity',
      property(gen, a => {
        return E.equals(M.concat(empty, a), a)
      })
    ),
    new Law(
      'Monoid: Right identity',
      property(gen, a => {
        return E.equals(M.concat(a, empty), a)
      })
    )
  ])
}

export function getFunctorLaws<F extends URIS>(
  F: Functor1<F>
): <A, C>(
  fagen: Generator<Type<F, A>>,
  SFA: Setoid<Type<F, A>>,
  SFC: Setoid<Type<F, C>>
) => <B>(ab: (a: A) => B, bc: (b: B) => C) => Laws
export function getFunctorLaws<F>(
  F: Functor<F>
): <A, C>(
  fagen: Generator<HKT<F, A>>,
  SFA: Setoid<HKT<F, A>>,
  SFC: Setoid<HKT<F, C>>
) => <B>(ab: (a: A) => B, bc: (b: B) => C) => Laws
export function getFunctorLaws<F>(
  F: Functor<F>
): <A, C>(
  fagen: Generator<HKT<F, A>>,
  SFA: Setoid<HKT<F, A>>,
  SFC: Setoid<HKT<F, C>>
) => <B>(ab: (a: A) => B, bc: (b: B) => C) => Laws {
  return (fagen, SFA, SFC) => (ab, bc) => {
    return [
      new Law('Funtor: Identity', getFunctionEquality(fagen, SFA)(fa => F.map(fa, a => a), identity)),
      new Law(
        'Funtor: Composition',
        getFunctionEquality(fagen, SFC)(fa => F.map(fa, compose(bc, ab)), fa => F.map(F.map(fa, ab), bc))
      )
    ]
  }
}

export function getApplyLaws<F extends URIS>(
  F: Apply1<F>
): <A, C>(
  fagen: Generator<Type<F, A>>,
  SFA: Setoid<Type<F, A>>,
  SFC: Setoid<Type<F, C>>
) => <B>(ab: (a: A) => B, bc: (b: B) => C, fab: HKT<F, (a: A) => B>, fbc: HKT<F, (b: B) => C>) => Laws
export function getApplyLaws<F>(
  F: Apply<F>
): <A, C>(
  fagen: Generator<HKT<F, A>>,
  SFA: Setoid<HKT<F, A>>,
  SFC: Setoid<HKT<F, C>>
) => <B>(ab: (a: A) => B, bc: (b: B) => C, fab: HKT<F, (a: A) => B>, fbc: HKT<F, (b: B) => C>) => Laws
export function getApplyLaws<F>(
  F: Apply<F>
): <A, C>(
  fagen: Generator<HKT<F, A>>,
  SFA: Setoid<HKT<F, A>>,
  SFC: Setoid<HKT<F, C>>
) => <B>(ab: (a: A) => B, bc: (b: B) => C, fab: HKT<F, (a: A) => B>, fbc: HKT<F, (b: B) => C>) => Laws {
  return (fagen, SFA, SFC) => (ab, bc, fab, fbc) =>
    getFunctorLaws(F)(fagen, SFA, SFC)(ab, bc).concat([
      new Law(
        'Apply: Associative composition',
        getFunctionEquality(fagen, SFC)(
          fa => F.ap(fbc, F.ap(fab, fa)),
          fa => F.ap(F.ap(F.map(fbc, bc => (ab: any) => compose(bc, ab)), fab), fa)
        )
      )
    ])
}

export function getApplicativeLaws<F extends URIS>(
  F: Applicative1<F>
): <A, B, C>(
  gen: Generator<A>,
  SFA: Setoid<Type<F, A>>,
  SFC: Setoid<Type<F, C>>,
  SFB: Setoid<Type<F, B>>
) => (ab: (a: A) => B, bc: (b: B) => C) => Laws
export function getApplicativeLaws<F>(
  F: Applicative<F>
): <A, B, C>(
  gen: Generator<A>,
  SFA: Setoid<HKT<F, A>>,
  SFC: Setoid<HKT<F, C>>,
  SFB: Setoid<HKT<F, B>>
) => (ab: (a: A) => B, bc: (b: B) => C) => Laws
export function getApplicativeLaws<F>(
  F: Applicative<F>
): <A, B, C>(
  gen: Generator<A>,
  SFA: Setoid<HKT<F, A>>,
  SFC: Setoid<HKT<F, C>>,
  SFB: Setoid<HKT<F, B>>
) => (ab: (a: A) => B, bc: (b: B) => C) => Laws {
  return (gen, SFA, SFC, SFB) => (ab, bc) => {
    const fagen = gen.then(F.of)
    const fab = F.of(ab)
    const fbc = F.of(bc)
    return getApplyLaws(F)(fagen, SFA, SFC)(ab, bc, fab, fbc).concat([
      new Law('Applicative: Identity', getFunctionEquality(fagen, SFA)(fa => F.ap(F.of((a: any) => a), fa), identity)),
      new Law(
        'Applicative: Composition',
        getFunctionEquality(fagen, SFC)(
          fa => F.ap(fbc, F.ap(fab, fa)),
          fa => F.ap(F.ap(F.ap(F.of((bc: any) => (ab: any) => compose(bc, ab) as any), fbc), fab), fa)
        )
      ),
      new Law(
        'Applicative: Homomorphism',
        getFunctionEquality(gen, SFB)(a => F.ap(F.of(ab), F.of(a)), a => F.of(ab(a)))
      ),
      new Law(
        'Applicative: Interchange',
        getFunctionEquality(gen, SFB)(a => F.ap(fab, F.of(a)), a => F.ap(F.of((ab: any) => ab(a)), fab))
      )
    ])
  }
}

export function getChainLaws<F extends URIS>(
  F: Chain1<F>
): <A, C>(
  fagen: Generator<Type<F, A>>,
  SFA: Setoid<Type<F, A>>,
  SFC: Setoid<Type<F, C>>
) => <B>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  fab: HKT<F, (a: A) => B>,
  fbc: HKT<F, (b: B) => C>,
  afb: (a: A) => HKT<F, B>,
  bfc: (b: B) => HKT<F, C>
) => Laws
export function getChainLaws<F>(
  F: Chain<F>
): <A, C>(
  fagen: Generator<HKT<F, A>>,
  SFA: Setoid<HKT<F, A>>,
  SFC: Setoid<HKT<F, C>>
) => <B>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  fab: HKT<F, (a: A) => B>,
  fbc: HKT<F, (b: B) => C>,
  afb: (a: A) => HKT<F, B>,
  bfc: (b: B) => HKT<F, C>
) => Laws
export function getChainLaws<F>(
  F: Chain<F>
): <A, C>(
  fagen: Generator<HKT<F, A>>,
  SFA: Setoid<HKT<F, A>>,
  SFC: Setoid<HKT<F, C>>
) => <B>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  fab: HKT<F, (a: A) => B>,
  fbc: HKT<F, (b: B) => C>,
  afb: (a: A) => HKT<F, B>,
  bfc: (b: B) => HKT<F, C>
) => Laws {
  return (fagen, SFA, SFC) => (ab, bc, fab, fbc, afb, bfc) => {
    return getApplyLaws(F)(fagen, SFA, SFC)(ab, bc, fab, fbc).concat([
      new Law(
        'Chain: Associativity',
        getFunctionEquality(fagen, SFC)(
          fa => F.chain(F.chain(fa, afb), bfc),
          fa => F.chain(fa, a => F.chain(afb(a), bfc))
        )
      )
    ])
  }
}

export function getMonadLaws<F extends URIS>(
  F: Monad1<F>
): <A, B, C>(
  gen: Generator<A>,
  SFA: Setoid<Type<F, A>>,
  SFC: Setoid<Type<F, C>>,
  SFB: Setoid<Type<F, B>>
) => (ab: (a: A) => B, bc: (b: B) => C) => Laws
export function getMonadLaws<F>(
  F: Monad<F>
): <A, B, C>(
  gen: Generator<A>,
  SFA: Setoid<HKT<F, A>>,
  SFC: Setoid<HKT<F, C>>,
  SFB: Setoid<HKT<F, B>>
) => (ab: (a: A) => B, bc: (b: B) => C) => Laws
export function getMonadLaws<F>(
  F: Monad<F>
): <A, B, C>(
  gen: Generator<A>,
  SFA: Setoid<HKT<F, A>>,
  SFC: Setoid<HKT<F, C>>,
  SFB: Setoid<HKT<F, B>>
) => (ab: (a: A) => B, bc: (b: B) => C) => Laws {
  return <A, B, C>(gen: Generator<A>, SFA: Setoid<HKT<F, A>>, SFC: Setoid<HKT<F, C>>, SFB: Setoid<HKT<F, B>>) => (
    ab: (a: A) => B,
    bc: (b: B) => C
  ) => {
    const afb = (a: A) => F.of(ab(a))
    return getApplicativeLaws(F)(gen, SFA, SFC, SFB)(ab, bc).concat([
      new Law('Monad: Left Identity', getFunctionEquality(gen, SFB)(a => F.chain(F.of(a), afb), afb)),
      new Law('Monad: Right Identity', getFunctionEquality(gen, SFB)(a => F.chain(afb(a), b => F.of(b)), afb))
    ])
  }
}

export function getSemiringLaws<A>(S: Semiring<A>, gen: Generator<A>, E: Setoid<A>): Laws {
  const zero = S.zero
  const one = S.one
  return [
    new Law(
      'Semiring: Addition Associativity',
      property(gen, gen, gen, (a, b, c) => {
        return E.equals(S.add(S.add(a, b), c), S.add(a, S.add(b, c)))
      })
    ),
    new Law(
      'Semiring: Addition Identity',
      property(gen, a => {
        const b = S.add(a, zero)
        const c = S.add(zero, a)
        return E.equals(b, c) && E.equals(b, a)
      })
    ),
    new Law(
      'Semiring: Addition Commutativity',
      property(gen, gen, (a, b) => {
        return E.equals(S.add(a, b), S.add(b, a))
      })
    ),
    new Law(
      'Semiring: Multiplication Associativity',
      property(gen, gen, gen, (a, b, c) => {
        return E.equals(S.mul(S.mul(a, b), c), S.mul(a, S.mul(b, c)))
      })
    ),
    new Law(
      'Semiring: Multiplication Identity',
      property(gen, a => {
        const b = S.mul(a, one)
        const c = S.mul(one, a)
        return E.equals(b, c) && E.equals(b, a)
      })
    ),
    new Law(
      'Semiring: Left distributivity',
      property(gen, gen, gen, (a, b, c) => {
        return E.equals(S.mul(a, S.add(b, c)), S.add(S.mul(a, b), S.mul(a, c)))
      })
    ),
    new Law(
      'Semiring: Right distributivity',
      property(gen, gen, gen, (a, b, c) => {
        return E.equals(S.mul(S.add(a, b), c), S.add(S.mul(a, c), S.mul(b, c)))
      })
    ),
    new Law(
      'Semiring: Annihilation',
      property(gen, a => {
        const b = S.mul(a, zero)
        const c = S.mul(zero, a)
        return E.equals(b, c) && E.equals(b, zero)
      })
    )
  ]
}

export function getRingLaws<A>(R: Ring<A>, gen: Generator<A>, E: Setoid<A>): Laws {
  const zero = R.zero
  return getSemiringLaws(R, gen, E).concat([
    new Law(
      'Ring: Additive inverse',
      property(gen, a => {
        const b = R.sub(a, a)
        const c = R.add(R.sub(zero, a), a)
        return E.equals(b, c) && E.equals(b, zero)
      })
    )
  ])
}

export function getFieldLaws<A>(F: Field<A>, gen: Generator<A>, E: Setoid<A>): Laws {
  const one = F.one
  const zero = F.zero
  const isZero: (a: A) => boolean = a => E.equals(zero, a)
  return getRingLaws(F, gen, E).concat([
    new Law(
      'Field: Commutative multiplication',
      property(gen, gen, (a, b) => {
        return E.equals(F.mul(a, b), F.mul(b, a))
      })
    ),
    new Law(
      'Field: Integral domain',
      property(gen, gen, (a, b) => {
        return !E.equals(a, zero) && !E.equals(b, zero) ? !E.equals(F.mul(a, b), zero) : !E.equals(one, zero)
      })
    ),
    new Law(
      'Field: Nonnegativity',
      property(gen, a => {
        return F.degree(a) >= 0
      })
    ),
    new Law(
      'Field: Quotient/remainder',
      property(gen, gen, (a, b) => {
        if (!isZero(b)) {
          const q = F.div(a, b)
          const r = F.mod(a, b)
          return E.equals(a, F.add(F.mul(q, b), r)) && (isZero(r) || F.degree(r) < F.degree(b))
        } else {
          return true
        }
      })
    ),
    new Law(
      'Field: Submultiplicative',
      property(gen, gen, (a, b) => {
        return !isZero(a) && !isZero(b) ? F.degree(a) <= F.degree(F.mul(a, b)) : true
      })
    )
  ])
}
