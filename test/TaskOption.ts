import * as assert from 'assert'
import { pipe } from '../src/function'
import * as O from '../src/Option'
import * as T from '../src/Task'
import * as _ from '../src/TaskOption'
import { assertPar, assertSeq } from './util'

describe('TaskOption', () => {
  // -------------------------------------------------------------------------------------
  // type class members
  // -------------------------------------------------------------------------------------

  it('map', async () => {
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(await pipe(_.some(1), _.map(double))(), O.some(2))
  })

  it('ap', async () => {
    const double = (n: number) => n * 2
    assert.deepStrictEqual(await pipe(_.some(double), _.ap(_.some(2)))(), O.some(4))
    assert.deepStrictEqual(await pipe(_.some(double), _.ap(_.none))(), O.none)
    assert.deepStrictEqual(await pipe(_.none, _.ap(_.some(2)))(), O.none)
    assert.deepStrictEqual(await pipe(_.none, _.ap(_.none))(), O.none)
  })

  it('chain', async () => {
    const f = (n: number) => _.some(n * 2)
    const g = () => _.none
    assert.deepStrictEqual(await pipe(_.some(1), _.chain(f))(), O.some(2))
    assert.deepStrictEqual(await pipe(_.none, _.chain(f))(), O.none)
    assert.deepStrictEqual(await pipe(_.some(1), _.chain(g))(), O.none)
    assert.deepStrictEqual(await pipe(_.none, _.chain(g))(), O.none)
  })

  it('alt', async () => {
    assert.deepStrictEqual(
      await pipe(
        _.some(1),
        _.alt(() => _.some(2))
      )(),
      O.some(1)
    )
    assert.deepStrictEqual(
      await pipe(
        _.some(2),
        _.alt(() => _.none as _.TaskOption<number>)
      )(),
      O.some(2)
    )
    assert.deepStrictEqual(
      await pipe(
        _.none,
        _.alt(() => _.some(1))
      )(),
      O.some(1)
    )
    assert.deepStrictEqual(
      await pipe(
        _.none,
        _.alt(() => _.none)
      )(),
      O.none
    )
  })

  it('zero', async () => {
    assert.deepStrictEqual(await _.zero()(), O.none)
  })

  it('fromIO', async () => {
    assert.deepStrictEqual(await _.fromIO(() => 1)(), O.some(1))
  })

  // -------------------------------------------------------------------------------------
  // instances
  // -------------------------------------------------------------------------------------

  it('ApplicativeSeq', async () => {
    await assertSeq(_.ApplySeq, _.FromTask, (fa) => fa())
    await assertSeq(_.ApplicativeSeq, _.FromTask, (fa) => fa())
  })

  it('ApplicativePar', async () => {
    await assertPar(_.ApplyPar, _.FromTask, (fa) => fa())
    await assertPar(_.ApplicativePar, _.FromTask, (fa) => fa())
  })

  // -------------------------------------------------------------------------------------
  // constructors
  // -------------------------------------------------------------------------------------

  it('tryCatch', async () => {
    assert.deepStrictEqual(await _.tryCatch(() => Promise.resolve(1))(), O.some(1))
    assert.deepStrictEqual(await _.tryCatch(() => Promise.reject())(), O.none)
  })

  it('fromNullable', async () => {
    assert.deepStrictEqual(await _.fromNullable(1)(), O.some(1))
    assert.deepStrictEqual(await _.fromNullable(null)(), O.none)
    assert.deepStrictEqual(await _.fromNullable(undefined)(), O.none)
  })

  it('fromNullableK', async () => {
    const f = _.fromNullableK((n: number) => (n > 0 ? n : n === 0 ? null : undefined))
    assert.deepStrictEqual(await f(1)(), O.some(1))
    assert.deepStrictEqual(await f(0)(), O.none)
    assert.deepStrictEqual(await f(-1)(), O.none)
  })

  it('chainNullableK', async () => {
    const f = _.chainNullableK((n: number) => (n > 0 ? n : n === 0 ? null : undefined))
    assert.deepStrictEqual(await f(_.of(1))(), O.some(1))
    assert.deepStrictEqual(await f(_.of(0))(), O.none)
    assert.deepStrictEqual(await f(_.of(-1))(), O.none)
  })

  it('fromPredicate', async () => {
    const p = (n: number): boolean => n > 2
    const f = _.fromPredicate(p)
    assert.deepStrictEqual(await f(1)(), O.none)
    assert.deepStrictEqual(await f(3)(), O.some(3))
  })

  // -------------------------------------------------------------------------------------
  // destructors
  // -------------------------------------------------------------------------------------

  it('fold', async () => {
    const f = _.fold(
      () => T.of('none'),
      (a) => T.of(`some(${a})`)
    )
    assert.deepStrictEqual(await pipe(_.some(1), f)(), 'some(1)')
    assert.deepStrictEqual(await pipe(_.none, f)(), 'none')
  })

  it('getOrElse', async () => {
    assert.deepStrictEqual(
      await pipe(
        _.some(1),
        _.getOrElse(() => T.of(2))
      )(),
      1
    )
    assert.deepStrictEqual(
      await pipe(
        _.none,
        _.getOrElse(() => T.of(2))
      )(),
      2
    )
  })

  // -------------------------------------------------------------------------------------
  // combinators
  // -------------------------------------------------------------------------------------

  it('fromOptionK', async () => {
    const f = _.fromOptionK((n: number) => (n > 0 ? O.some(n) : O.none))
    assert.deepStrictEqual(await f(1)(), O.some(1))
    assert.deepStrictEqual(await f(-1)(), O.none)
  })

  it('chainOptionK', async () => {
    const f = _.chainOptionK((n: number) => (n > 0 ? O.some(n) : O.none))
    assert.deepStrictEqual(await f(_.some(1))(), O.some(1))
    assert.deepStrictEqual(await f(_.some(-1))(), O.none)
    assert.deepStrictEqual(await f(_.none)(), O.none)
  })

  it('sequenceArray', async () => {
    // tslint:disable-next-line: readonly-array
    const log: Array<number | string> = []
    const some = (n: number): _.TaskOption<number> =>
      _.fromIO(() => {
        log.push(n)
        return n
      })
    const none = (s: string): _.TaskOption<number> =>
      pipe(
        T.fromIO(() => {
          log.push(s)
          return s
        }),
        T.map(() => O.none)
      )
    assert.deepStrictEqual(await pipe([some(1), some(2)], _.sequenceArray)(), O.some([1, 2]))
    assert.deepStrictEqual(await pipe([some(3), none('a')], _.sequenceArray)(), O.none)
    assert.deepStrictEqual(await pipe([none('b'), some(4)], _.sequenceArray)(), O.none)
    assert.deepStrictEqual(log, [1, 2, 3, 'a', 'b', 4])
  })

  it('sequenceSeqArray', async () => {
    // tslint:disable-next-line: readonly-array
    const log: Array<number | string> = []
    const some = (n: number): _.TaskOption<number> =>
      _.fromIO(() => {
        log.push(n)
        return n
      })
    const none = (s: string): _.TaskOption<number> =>
      pipe(
        T.fromIO(() => {
          log.push(s)
          return s
        }),
        T.map(() => O.none)
      )
    assert.deepStrictEqual(await pipe([some(1), some(2)], _.sequenceSeqArray)(), O.some([1, 2]))
    assert.deepStrictEqual(await pipe([some(3), none('a')], _.sequenceSeqArray)(), O.none)
    assert.deepStrictEqual(await pipe([none('b'), some(4)], _.sequenceSeqArray)(), O.none)
    assert.deepStrictEqual(log, [1, 2, 3, 'a', 'b'])
  })

  it('tryCatchK', async () => {
    const f = (n: number) => (n > 0 ? Promise.resolve(n) : Promise.reject(n))
    const g = _.tryCatchK(f)
    assert.deepStrictEqual(await g(1)(), O.some(1))
    assert.deepStrictEqual(await g(-1)(), O.none)
  })
})
