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
import PortfolioStore from "stores/PortfolioStore";
import WalletApi from "api/WalletApi";
import WalletDb from "stores/WalletDb";
import {LimitOrder,Price,LimitOrderCreate} from "common/MarketClasses";
import marketUtils from "common/market_utils";
import WalletUnlockStore from "stores/WalletUnlockStore";


class PortfolioActions {

    incrementAsset(asset){
        return dispatch => {
            dispatch({asset});
        }
    }

    decrementAsset(asset){
        return dispatch => {
            dispatch({asset});
        }
    }

    updatePortfolio(account, router){
        if(WalletUnlockStore.getState().locked) {
            router.push('/unlock')
            return dispatch => dispatch()
        }

        PortfolioStore.setLoading();

        let portfolio = PortfolioStore.getState().data;
        let baseAsset = ChainStore.getAsset("BTS");
        let baseBalance = portfolio.filter((filterAsset) => filterAsset.assetShortName == "BTS")[0].amount;

        let ordersCallbacks = [];

        portfolio.forEach((asset) => {
            asset.btsCountToSell = Math.floor((baseBalance / 100) * asset.futureShare);

            if (asset.assetFullName != "BTS" && asset.btsCountToSell && asset.assetShortName == "LTC"){
                console.log("ASSET",asset)
                let quoteAsset = ChainStore.getObject(asset.assetMap.get("id"));
                let assets = {
                    [quoteAsset.get("id")]: {precision: quoteAsset.get("precision")},
                    [baseAsset.get("id")]: {precision: baseAsset.get("precision")}
                };

                ordersCallbacks.push(
                    Apis.instance().db_api().exec("get_limit_orders", [ baseAsset.get("id"), quoteAsset.get("id"), 50 ])
                    .then((results)=>{
                        let orders = [];
                        results.forEach((result) => {
                            let order = new LimitOrder(result, assets, quoteAsset.get("id"));
                            orders.push(order);
                        });
                        //let bids = marketUtils.getBids(orders);
                        let asks = marketUtils.getAsks(orders);

                        let totalBtsAsk = 0;
                        for (let i = 0; i < asks.length; i++){
                            let ask = asks[i];
                            let forSale = ask.totalToReceive({noCache: true});
                            totalBtsAsk += forSale.amount;
                            if (totalBtsAsk >= asset.btsCountToSell){
                                forSale.amount = asset.btsCountToSell;
                                let toReceive = forSale.times(ask.sellPrice());

                                let order = new LimitOrderCreate({
                                    for_sale: forSale,
                                    to_receive: toReceive,
                                    seller: account.get("id"),
                                    fee: {
                                        asset_id: baseAsset.get("id"),
                                        amount: 0
                                    }
                                });
                                order.type = "buy";
                                console.log("ORDER FOR " + asset.assetFullName,order);
                                return order;
                            }
                        }
                    })
                );
            }
        });

        return dispatch => {
            return Promise.all(ordersCallbacks).then(function(orders) {
                var buyTransaction = WalletApi.new_transaction();
                orders.forEach((order)=>{
                    order.setExpiration();
                    if (order.type == "buy"){
                        order = order.toObject();
                        buyTransaction.add_type_operation("limit_order_create", order);
                    }
                });

                //Вот в этот момент нужно вызвать кастомный экран подтверждения на котором будет список операций (orders)
                //Пока что там можно просто вывести их в строчку по паре полей (желтым шрифтом как на accontoverview)
                //Соответствено на экране будет input для пароля, потом список операций, потом две кнопки Approve, Deny
                //Ессли выбрано Approve то исполняется код который дальше, если нет - то dispatch("canceled")
                //Нужно убрать анлок на входе в manage чтобы начать.
                //Строка в формате: Покупаем X {AssetName} За Y BTS (order.type == "buy")
                //                  Покупаем X BTS за Y {AssetName} (order.type == "sell" - но его пока нет, я добавлю в процессе)


                WalletDb.process_transaction(buyTransaction, null, true).then(result => {
                    console.log("DONE TRANSACTION",result);
                    dispatch();
                })
                .catch(error => {
                    console.log("order error:", error);
                    return {error};
                });
            });
        }
    }

    

	concatPortfolio(account){
        portfolioStorage.set("portfolio",{});
        let balances  = PortfolioStore.getBalances(account)
        let activeBalaces = []

        let portfolioData = PortfolioStore.getPortfolio().data.slice()

        balances.forEach(b=> {

            let balance = ChainStore.getObject(b)
            let balanceAsset = ChainStore.getObject(balance.get("asset_type"))

            if (balanceAsset) {

                let data = portfolioData.filter(p=>{
                    return p.assetShortName==balanceAsset.get("symbol") || p.assetFullName==balanceAsset.get("symbol")
                })
                let futureShare
                if(data.length){
                   futureShare = portfolioData.splice(portfolioData.findIndex(i=>i.assetFullName==data[0].assetFullName), 1)[0].futureShare 
                } 
             
                let asset_type = balance.get("asset_type");
                let asset = ChainStore.getObject(asset_type);
                if(asset) {
                    let s = asset.get("symbol")
                    let amount = Number(balance.get("balance"))
                    activeBalaces.push({
                        balanceID: b,
                        balanceMap: balance,
                        assetShortName: ~s.search(/open/i)?s.substring(5):s,
                        assetFullName: s, 
                        futureShare: futureShare || 0, 
                        currentShare: +countShares(amount, asset_type, true), 
                        bitUSDShare: +countShares(amount, asset_type),
                        amount,
                    })    
                } 
            
            }
           
        })

        let data = activeBalaces.concat(portfolioData)

        let port = {
            data,
            map: data.map(b=>b.assetShortName)
        }
		return dispatch =>{
	        return new Promise((resolve, reject)=>{
	            Promise.resolve().then(()=>{
	                port.data.forEach((item, index)=>{
	                    Apis.instance().db_api().exec("list_assets", [
	                        item.assetFullName, 1
	                    ]).then(assets => {
                            ChainStore._updateObject(assets[0], false);
	                        let bal = port.data[index];
	                        bal.assetMap = createMap(assets[0]);
	                        if(!bal.balanceMap) {
	                            bal.balanceID = null;
	                            bal.balanceMap = createMap({
	                                id:"0",
	                                owner: "0",
	                                asset_type: "0",
	                                balance: "0"
	                            })
	                            bal.amount = 0;
	                            bal.currentShare =  0;
	                            bal.bitUSDShare = 0;
	                        }
	                        if(!bal.futureShare) bal.futureShare = 0;
	                    })  
	                })
	                
	            }).then(()=>{
                    port.totalFutureShare = 0;
                    port.data.forEach(i=>{
                        PortfolioStore.getState().data && PortfolioStore.getState().data.forEach(already=>{
                            if(already.assetShortName == i.assetShortName) {
                                i.futureShare = already.futureShare;
                            }
                        })
                        port.totalFutureShare += i.futureShare;
                    })

	                portfolioStorage.set("portfolio",port);
	                resolve(port);
	                dispatch(port);
	            })
	        })
		}
    }
}

let portfolioStorage = new ls("__trusty_portfolio__");

const createMap = (myObj) =>{
     return new Map(
        Object
            .keys(myObj)
            .map(
                key => [key, myObj[key]]
            )
    )
}

const countShares = (amount, fromAsset, percentage=false) => {

    fromAsset = ChainStore.getObject(fromAsset)
    let toAsset = ChainStore.getAsset("USD")

    if(!toAsset) return 0

    let marketStats = MarketsStore.getState().allMarketStats

    let coreAsset = ChainStore.getAsset("1.3.0");
    let toStats, fromStats;
    let toID = toAsset.get("id");
    let toSymbol = toAsset.get("symbol");
    let fromID = fromAsset.get("id");
    let fromSymbol = fromAsset.get("symbol");

    if (coreAsset && marketStats) {
        let coreSymbol = coreAsset.get("symbol");
        toStats = marketStats.get(toSymbol + "_" + coreSymbol);
        fromStats = marketStats.get(fromSymbol + "_" + coreSymbol);
    }

    let price = utils.convertPrice(fromStats && fromStats.close ? fromStats.close :
                                    fromID === "1.3.0" || fromAsset.has("bitasset") ? fromAsset : null,
                                    toStats && toStats.close ? toStats.close :
                                    (toID === "1.3.0" || toAsset.has("bitasset")) ? toAsset : null,
                                    fromID,
                                    toID);

    let eqValue = price ? utils.convertValue(price, amount, fromAsset, toAsset) : 0;


    let TRFNDPrice = 0



    let formatValue = v => v < 1 ? Math.ceil(v) : Math.floor(v) || 0

    if(fromAsset.get("symbol") == "TRFND") {

        let { combinedBids, highestBid } = MarketsStore.getState().marketData

        TRFNDPrice = combinedBids.map(order=>order.getPrice())[0]

        let asset = fromAsset.toJS()
        let precision = utils.get_asset_precision(asset.precision);
        let p = (TRFNDPrice * (amount / precision))
        let totalBts = localStorage.getItem("_trusty_bts_total_value")

        if(!totalBts) return 0

        let percent = ((p/totalBts)*100)
        if(percentage) return formatValue(percent)

        let totalAmount = +localStorage.getItem("_trusty_total_value")
        if(!totalAmount) return 0

        return formatValue(totalAmount/100*percent)

    } 

    if(percentage) {
        let totalAmount = +localStorage.getItem("_trusty_total_value")
        if(!totalAmount) return 0
        let percent = eqValue.toFixed(2) / totalAmount.toFixed(2) * 100
        return formatValue(percent)
    } else {
        let asset = toAsset.toJS()
        let precision = utils.get_asset_precision(asset.precision);
        return formatValue(eqValue / precision)
    }
}

export default alt.createActions(PortfolioActions)