import React from "react";
import BlockTradesGatewayDepositRequest from "../DepositWithdraw/blocktrades/BlockTradesGatewayDepositRequest";
import Translate from "react-translate-component";
import { connect } from "alt-react";
import SettingsStore from "stores/SettingsStore";
import SettingsActions from "actions/SettingsActions";
import { RecentTransactions, TransactionWrapper } from "components/Account/RecentTransactions";
import Immutable from "immutable";
import cnames from "classnames";
import LoadingIndicator from "components/LoadingIndicator";
import TrustyInput from "components/Trusty/Forms/TrustyInput"
import ResizingSelect from "components/Trusty/ResizingSelect"
import CoinStore from "stores/CoinStore"

class BlockTradesGateway extends React.Component {
    constructor(props) {
        super();

        let action = props.viewSettings.get(`${props.provider}Action`, "deposit");
        if(!props.deposit_only) action = 'withdraw'
        this.state = {
            activeCoin: this._getActiveCoin(props, {action}),
            action,

        };
    }

    componentDidMount(){
        let newValue = ~window.location.pathname.indexOf("withdraw") ? "OPEN." + this.props.changedCoinName : this.props.changedCoinName 
        this.onSelectCoin({target:{value: newValue}})
    }

    _getActiveCoin(props, state) {
        let cachedCoin = props.viewSettings.get(`activeCoin_${props.provider}_${state.action}`, null);
		let firstTimeCoin = null;
		if ((props.provider == 'blocktrades') && (state.action == 'deposit')) {
			firstTimeCoin = props.changedCoinName//'BTC';
		}
		if ((props.provider == 'openledger') && (state.action == 'deposit')) {
			firstTimeCoin = props.changedCoinName//'BTC';
		}
		if ((props.provider == 'blocktrades') && (state.action == 'withdraw')) {
			firstTimeCoin = 'TRADE.BTC';
		}
		if ((props.provider == 'openledger') && (state.action == 'withdraw')) {
			firstTimeCoin = 'OPEN.'+props.changedCoinName// OPEN.BTC';
		}
        let activeCoin = cachedCoin ? cachedCoin : firstTimeCoin;
        return activeCoin;
        //return  firstTimeCoin
    }

    componentWillReceiveProps(nextProps) {

        if (nextProps.provider !== this.props.provider) {
            this.setState({
                activeCoin: this._getActiveCoin(nextProps, this.state.action)
            });
        }


        if(nextProps.changedCoinName != this.props.changedCoinName) {
            let newValue = ~window.location.pathname.indexOf("withdraw") ? "OPEN." + nextProps.changedCoinName : nextProps.changedCoinName 
            this.onSelectCoin({target:{value: newValue}})
        }

    }

    // shouldComponentUpdate(nextProps, nextState) {
    //     if (nextState.action !== this.state.action) {
    //         this.setState({
    //             activeCoin: this._getActiveCoin(nextProps, nextState)
    //         });
    //     }

    //     return true;
    // }

    onSelectCoin(e) {
        this.setState({
            activeCoin: e.target.value
        });

        let setting = {};
        setting[`activeCoin_${this.props.provider}_${this.state.action}`] = e.target.value;
        SettingsActions.changeViewSetting(setting);
    }

    changeAction(type) {

        let activeCoin = this._getActiveCoin(this.props, {action: type});

        this.setState({
            action: type,
            activeCoin: activeCoin
        });

        SettingsActions.changeViewSetting({[`${this.props.provider}Action`]: type});
    }

    render() {
        let {coins, account, provider} = this.props;
        let {activeCoin, action} = this.state;
        if (!coins.length) {
            return <LoadingIndicator />;
        }

        let filteredCoins = coins.filter(a => {
            if (!a || !a.symbol) {
                return false;
            } else {
                return action === "deposit" ? a.depositAllowed : a.withdrawalAllowed;
            }
        });

        let coinOptions = filteredCoins.map(coin => {
            let option = action === "deposit" ? coin.backingCoinType.toUpperCase() : coin.symbol;
            return <option value={option} key={coin.symbol}>{option}</option>;
        }).filter(a => {
            return a !== null;
        });

        let coin = filteredCoins.filter(coin => {
            return (action === "deposit" ? coin.backingCoinType.toUpperCase() === activeCoin : coin.symbol === activeCoin);
        })[0];

        if (!coin) coin = filteredCoins[0];

        let issuers = {
            blocktrades: {name: "blocktrades", id: "1.2.32567", support: "support@blocktrades.us"},
            openledger: {name: coin.intermediateAccount, id: "1.2.96397", support: "https://openledger.freshdesk.com"}
        };

        let issuer = issuers[provider];

        let isDeposit = this.state.action === "deposit";

        let select =    (
            <select
                onChange={this.onSelectCoin.bind(this)}
                type={"select"}
                value={activeCoin}>
                    {coinOptions}
            </select>
        )

        let resizingSelect =    (
            <ResizingSelect
                onChange={this.onSelectCoin.bind(this)}
                type={"select"}
                value={activeCoin}>
                    {coinOptions}
            </ResizingSelect>
        )


        return (

            <div style={this.props.style}>
                <div>
        
                    { !coin.isAvailable && coin || ~window.location.pathname.indexOf("deposit") ? <TrustyInput className={"_trusty_hide_input"} input={select} type="select" label={"select coin"} isOpen={true}/> : null }
                    { ~window.location.pathname.indexOf("deposit") ? <div className={"trusty_help_text _yellow"}>Send { this.state.activeCoin } to the address below</div> : null }
{/*                    <div className="medium-6 medium-offset-1">
                        <label style={{minHeight: "2rem"}} className="left-label"><Translate content="gateway.gateway_text" />:</label>
                        <div style={{paddingBottom: 15}}>
                            <ul className="button-group segmented no-margin">
                            <li className={action === "deposit" ? "is-active" : ""}><a onClick={this.changeAction.bind(this, "deposit")}><Translate content="gateway.deposit" /></a></li>
                            <li className={action === "withdraw" ? "is-active" : ""}><a onClick={this.changeAction.bind(this, "withdraw")}><Translate content="gateway.withdraw" /></a></li>
                            </ul>
                        </div>
                    </div>*/}
                </div>

                {!coin ? null :
                <div>


                    <div style={{marginBottom: 15}}>
                        <BlockTradesGatewayDepositRequest
                            trustySelects={resizingSelect}
                            key={`${provider}.${coin.symbol}`}
                            gateway={provider}
                            issuer_account={issuer.name}
                            account={account}
                            deposit_asset={coin.backingCoinType.toUpperCase()}
                            deposit_asset_name={coin.name}
                            deposit_coin_type={coin.backingCoinType.toLowerCase()}
                            deposit_account={coin.depositAccount}
                            deposit_wallet_type={coin.walletType}
                            gateFee={coin.gateFee}
                            receive_asset={coin.symbol}
                            receive_coin_type={coin.symbol.toLowerCase()}
                            supports_output_memos={coin.supportsMemos}
                            isAvailable={coin.isAvailable}
                            action={this.state.action}
                        />
                    </div>

                    {/*coin && coin.symbol ?
                    <TransactionWrapper
                        asset={coin.symbol}
                        fromAccount={
                            isDeposit ? (issuer.id) :
                            this.props.account.get("id")
                        }
                        to={
                            isDeposit ? ( this.props.account.get("id") ) :
                            (issuer.id)
                        }

                    >
                        { ({asset, to, fromAccount}) => {
                            return <RecentTransactions
                                accountsList={Immutable.List([this.props.account.get("id")])}
                                limit={10}
                                compactView={true}
                                fullHeight={true}
                                filter="transfer"
                                title={<Translate content={"gateway.recent_" + this.state.action} />}
                                customFilter={{
                                    fields: ["to", "from", "asset_id"],
                                    values: {
                                        to: to.get("id"),
                                        from: fromAccount.get("id") ,
                                        asset_id: asset.get("id")
                                    }
                                }}
                            />;
                        }
                        }
                    </TransactionWrapper> : null*/}
                </div>
                }
            </div>
        )
    }
}

export default connect(BlockTradesGateway, {
    listenTo() {
        return [SettingsStore,CoinStore];
    },
    getProps() {
        return {
            viewSettings: SettingsStore.getState().viewSettings,
            changedCoinValue: CoinStore.getState().coinValue,
            changedCoinName: CoinStore.getState().coinType,
        };
    }
});


