import BaseStore from "./BaseStore";
import alt from "alt-instance";
import ls from "common/localStorage";
import AccountStore from "stores/AccountStore";
import {ChainStore} from "bitsharesjs/es";
import MarketsActions from "actions/MarketsActions";
import MarketsStore from "stores/MarketsStore";
import Immutable from "immutable";
import AssetActions from 'actions/AssetActions';
import { dispatcher } from 'components/Trusty/utils';
import {Apis} from "bitsharesjs-ws";
import utils from "common/utils";
import PortfolioActions from "actions/PortfolioActions"

const defaultLoading = {update: true};
let portfolioStorage = new ls("__trusty_portfolio__");

class PortfolioStore extends BaseStore {
	constructor() {
        super();
        this.summValid = false;

        this._export(
            "getDefaultPortfolio",
            "getBalances",
            "setLoading"
        );

        this.getDefaultPortfolio = this.getDefaultPortfolio.bind(this);
        this.getBalances = this.getBalances.bind(this);
        this.setLoading = this.setLoading.bind(this);

        this.state = {
            data: null,
            totalPercentageFutureShare: 0,
            loading: defaultLoading,
            totalBaseValue: 0
        }

        this.bindListeners({
            onCompilePortfolio: PortfolioActions.compilePortfolio,
            onIncrementAsset: PortfolioActions.incrementAsset,
            onDecrementAsset: PortfolioActions.decrementAsset,
            onUpdatePortfolio: PortfolioActions.updatePortfolio,
        })
    }

    getBalances(account){
        let account_balances = account.get("balances");
        let orders = account.get("orders", null);
        if (account_balances) {
            // Filter out balance objects that have 0 balance or are not included in open orders
            account_balances = account_balances.filter((a, index) => {
                let balanceObject = ChainStore.getObject(a);
                if (balanceObject && (!balanceObject.get("balance") && !orders[index])) {
                    return false;
                } else {
                    return true;
                }
            })
        }
        return account_balances;
    }

    getDefaultPortfolio(){
        return {
          base: "BTS",
          data: [
            {
              asset: "OPEN.BTC",
              share: 60,
            },
            {
              asset: "OPEN.ETH",
              share: 10,
            },
            {
              asset: "OPEN.DASH",
              share: 5,
            },
            {
              asset: "OPEN.LTC",
              share: 10,
            },
            {
              asset: "OPEN.EOS",
              share: 4,
            },
            {
              asset: "OPEN.STEEM",
              share: 4,
            },
            {
              asset: "BTS",
              share: 4,
            },
            {
              asset: "TRFND",
              share: 3,
            },

          ]
        }
    }


    onCompilePortfolio(portfolio){
        this.setState({
            data: portfolio.data,
            totalPercentageFutureShare: portfolio.totalFutureShare,
            loading: defaultLoading,
            totalBaseValue: portfolio.totalBaseValue
        })
    }

    onIncrementAsset({asset}) {
        let data = this.state.data.slice()
        let totalPercentageFutureShare = 0
        let loading = defaultLoading
        data.forEach(i=>{
            if(i.assetShortName==asset) i.futureShare++
            totalPercentageFutureShare+= i.futureShare
        })
        this.setState({data, totalPercentageFutureShare, loading})
    }

    onDecrementAsset({asset}) {
        let data = this.state.data.slice()
        let totalPercentageFutureShare = 0
        let loading = defaultLoading
        data.forEach(i=>{
            if(i.assetShortName==asset) i.futureShare--
            totalPercentageFutureShare+= i.futureShare
        })
        this.setState({data, totalPercentageFutureShare, loading})
    }

    setLoading(){
      this.state.loading = {update: true};
    }

    onUpdatePortfolio(){
      this.state.loading.update = false;
    }


}
export default alt.createStore(PortfolioStore, "PortfolioStore");