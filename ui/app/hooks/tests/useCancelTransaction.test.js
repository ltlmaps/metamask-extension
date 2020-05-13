import * as reactRedux from 'react-redux'
import assert from 'assert'
import { renderHook } from '@testing-library/react-hooks'
import sinon from 'sinon'
import transactions from '../../../../test/data/transaction-data.json'
import { getConversionRate, getSelectedAccount } from '../../selectors'
import { useCancelTransaction } from '../useCancelTransaction'
import { showModal } from '../../store/actions'
import { increaseLastGasPrice } from '../../helpers/utils/confirm-tx.util'

let useSelector, useDispatch

const dispatch = sinon.spy()

describe('useCancelTransaction', function () {
  before(function () {
    useDispatch = sinon.stub(reactRedux, 'useDispatch')
    useDispatch.returns(dispatch)
  })

  afterEach(function () {
    dispatch.resetHistory()
  })

  describe('when account has insufficent balance to cover gas', function () {
    before(function () {
      useSelector = sinon.stub(reactRedux, 'useSelector')
      useSelector.callsFake((selector) => {
        if (selector === getConversionRate) {
          return 280.46
        } else if (selector === getSelectedAccount) {
          return {
            balance: '0x3',
          }
        }
      })
    })
    transactions.forEach((transactionGroup) => {
      const originalGasPrice = transactionGroup.primaryTransaction.txParams?.gasPrice
      const gasPrice = originalGasPrice && increaseLastGasPrice(originalGasPrice)
      it(`should indicate account has insufficient funds to cover ${gasPrice} gas price`, function () {
        const { result } = renderHook(() => useCancelTransaction(transactionGroup))
        assert.equal(result.current[0], false)
      })
      it(`should return a function that is a noop`, function () {
        const { result } = renderHook(() => useCancelTransaction(transactionGroup))
        assert.equal(typeof result.current[1], 'function')
        result.current[1]({ preventDefault: () => {}, stopPropagation: () => {} })
        assert.equal(dispatch.notCalled, true)
      })
    })
    after(function () {
      useSelector.restore()
    })
  })


  describe('when account has sufficient balance to cover gas', function () {
    before(function () {
      useSelector = sinon.stub(reactRedux, 'useSelector')
      useSelector.callsFake((selector) => {
        if (selector === getConversionRate) {
          return 280.46
        } else if (selector === getSelectedAccount) {
          return {
            balance: '0x9C2007651B2500000',
          }
        }
      })
    })
    transactions.forEach((transactionGroup) => {
      const originalGasPrice = transactionGroup.primaryTransaction.txParams?.gasPrice
      const gasPrice = originalGasPrice && increaseLastGasPrice(originalGasPrice)
      const transactionId = transactionGroup.initialTransaction.id
      it(`should indicate account has funds to cover ${gasPrice} gas price`, function () {
        const { result } = renderHook(() => useCancelTransaction(transactionGroup))
        assert.equal(result.current[0], true)
      })
      it(`should return a function that kicks off cancellation for id ${transactionId}`, function () {
        const { result } = renderHook(() => useCancelTransaction(transactionGroup))
        assert.equal(typeof result.current[1], 'function')
        result.current[1]({ preventDefault: () => {}, stopPropagation: () => {} })
        assert.equal(
          dispatch.calledWith(
            showModal({
              name: 'CANCEL_TRANSACTION',
              transactionId,
              originalGasPrice,
            })
          ),
          true
        )
      })
    })
    after(function () {
      useSelector.restore()
    })
  })


  after(function () {
    useSelector.restore()
    useDispatch.restore()
  })
})
