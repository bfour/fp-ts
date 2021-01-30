import * as Benchmark from 'benchmark'
import * as A from '../../src/Array'
import * as T from '../../src/Task'
import { pipe } from '../../src/function'

/*
for an array with size 1000
A.sequence(T.task) x 534 ops/sec ±10.52% (64 runs sampled)
T.sequenceArray x 4,237 ops/sec ±7.82% (71 runs sampled)
Fastest is Promise.allA
*/

const suite = new Benchmark.Suite()

const as = pipe(A.range(0, 1000), A.map(T.of))

suite
  .add('A.sequence(T.ApplicativePar)', function () {
    return pipe(as, A.sequence(T.ApplicativePar))()
  })
  .add('T.sequenceArray', function () {
    return pipe(as, T.sequenceArray)()
  })
  .on('cycle', function (event: any) {
    // tslint:disable-next-line: no-console
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    // tslint:disable-next-line: no-console
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run({ async: true })
