import React from "react";
import { connect } from "alt-react";
import accountUtils from "common/account_utils";
import utils from "common/utils";
import Translate from "react-translate-component";
import ChainTypes from "components/Utility/ChainTypes";
import BindToChainState from "components/Utility/BindToChainState";
//import TranswiserDepositWithdraw from "components/DepositWithdraw/transwiser/TranswiserDepositWithdraw";
import BlockTradesGateway from "components/Trusty/DepositWithdraw/BlockTradesGateway";
import OpenLedgerFiatDepositWithdrawal from "components/DepositWithdraw/openledger/OpenLedgerFiatDepositWithdrawal";
import OpenLedgerFiatTransactionHistory from "components/DepositWithdraw/openledger/OpenLedgerFiatTransactionHistory";
import BlockTradesBridgeDepositRequest from "components/Trusty/DepositWithdraw/blocktrades/BlockTradesBridgeDepositRequest";
import HelpContent from "components/Utility/HelpContent";
import AccountStore from "stores/AccountStore";
import SettingsStore from "stores/SettingsStore";
import SettingsActions from "actions/SettingsActions";
import { Apis } from "bitsharesjs-ws";
import { settingsAPIs } from "api/apiConfig";
import BitKapital from "components/DepositWithdraw/BitKapital";
import GatewayStore from "stores/GatewayStore";
import GatewayActions from "actions/GatewayActions";
import AccountImage from "components/Account/AccountImage";
import TrustyInput from "components/Trusty/Forms/TrustyInput"
import coinDefinition from "components/Trusty/definition"
import ResizingSelect from "components/Trusty/ResizingSelect"
import PropTypes from "prop-types"
import TopInputs from "components/Trusty/DepositWithdrawInputs"
import DepositFiat from "../Cryptobot/Deposit";


import CoinStore from "stores/CoinStore"


class AccountDepositWithdraw extends React.Component {

    static propTypes = {
        account: ChainTypes.ChainAccount.isRequired,
        contained: React.PropTypes.bool,
        deposit: React.PropTypes.bool
    };

    static defaultProps = {
        contained: false,
        deposit: false
    };


    constructor(props) {
        super();
        this.state = {
            olService: props.viewSettings.get("olService", "gateway"),
            btService: props.viewSettings.get("btService", "bridge"),
            metaService: props.viewSettings.get("metaService", "bridge"),
            activeService: 0,//props.viewSettings.get("activeService", 0),
            activeType: "crypto",
            coinType: "BTC",
        };

    }

    shouldComponentUpdate(nextProps, nextState) {

        return (
            nextProps.account !== this.props.account ||
            !utils.are_equal_shallow(nextProps.blockTradesBackedCoins, this.props.blockTradesBackedCoins) ||
            !utils.are_equal_shallow(nextProps.openLedgerBackedCoins, this.props.openLedgerBackedCoins) ||
            nextState.olService !== this.state.olService ||
            nextState.btService !== this.state.btService ||
            nextState.metaService !== this.state.metaService ||
            nextState.activeService !== this.state.activeService
        );
    }

    componentWillMount() {
        accountUtils.getFinalFeeAsset(this.props.account, "transfer");
    }

    toggleOLService(service) {
        this.setState({
            olService: service
        });

        SettingsActions.changeViewSetting({
            olService: service
        });
    }

    toggleBTService(service) {
        this.setState({
            btService: service
        });

        SettingsActions.changeViewSetting({
            btService: service
        });
    }

    toggleMetaService(service) {
        this.setState({
            metaService: service
        });

        SettingsActions.changeViewSetting({
            metaService: service
        });
    }

    onSetType(e) {
        //let index = this.state.services.indexOf(e.target.value);
        this.setState({
            activeType: e.target.value
        });

        switch (e.target.value) {
            case "fiat": this.toggleOLService("fiat")
            break;
            case "crypto": this.toggleOLService("gateway")
        }

    }

    componentWillReceiveProps(nextProps){
        if(nextProps.changedCoinValue != this.props.changedCoinName) {
            this.forceUpdate()
        }
    }
    
    onSetService(e) {
        //let index = this.state.services.indexOf(e.target.value);

        this.setState({
            activeService: parseInt(e.target.value)
        });

        SettingsActions.changeViewSetting({
            activeService: parseInt(e.target.value)
        });
    }

    renderServices(blockTradesGatewayCoins, openLedgerGatewayCoins) {
        //let services = ["Openledger (OPEN.X)", "BlockTrades (TRADE.X)", "Transwiser", "BitKapital"];
        let serList = [];
        let { account } = this.props;
        let { olService, btService } = this.state;


        serList.push({
            name: "Openledger (OPEN.X)",
            template: (
                <div className="content-block">
                        {olService === "gateway" && openLedgerGatewayCoins.length ?
                        <BlockTradesGateway
                            deposit_only={this.props.deposit}
                            account={account}
                            coins={openLedgerGatewayCoins}
                            provider="openledger"
                        /> : null}

                        {olService === "fiat" ?
                        <div>
                            <div style={{paddingBottom: 15}}><Translate component="h5" content="gateway.fiat_text" /></div>

                            <OpenLedgerFiatDepositWithdrawal
                                rpc_url={settingsAPIs.RPC_URL}
                                account={account}
                                issuer_account="openledger-fiat" />
                            <OpenLedgerFiatTransactionHistory
                                rpc_url={settingsAPIs.RPC_URL}
                                account={account} />
                        </div> : null}
                    </div>
            )
        });

        serList.push({
            name: "BlockTrades (TRADE.X)",
            template: (
                <div>
                        <div className="content-block">
                            {btService === "bridge" ?
                            <BlockTradesBridgeDepositRequest
                                coinInputValue={this.props.changedCoinValue}
                                deposit_only={this.props.deposit}
                                gateway="blocktrades"
                                issuer_account="blocktrades"
                                account={account}
                                initial_deposit_input_coin_type="btc"
                                initial_deposit_output_coin_type="bts"
                                initial_deposit_estimated_input_amount="1.0"
                                initial_withdraw_input_coin_type="bts"
                                initial_withdraw_output_coin_type="btc"
                                initial_withdraw_estimated_input_amount="100000"
                                initial_conversion_input_coin_type="bts"
                                initial_conversion_output_coin_type="bitbtc"
                                initial_conversion_estimated_input_amount="1000"
                            /> : null}

                        </div>
                        <div className="content-block">
                        </div>
                    </div>)
        });
        //let a = serList.reverse()
        return serList;
    }

    render() {
        let { account } = this.props;
        let { activeService, activeType } = this.state;
        let blockTradesGatewayCoins = this.props.blockTradesBackedCoins.filter(coin => {
            if (coin.backingCoinType.toLowerCase() === "muse") {
                return false;
            }
            return coin.symbol.toUpperCase().indexOf("TRADE") !== -1;
        })
        .map(coin => {
            return coin;
        })
        .sort((a, b) => {
            if (a.symbol < b.symbol)
                return -1;
            if (a.symbol > b.symbol)
                return 1;
            return 0;
        });

        let openLedgerGatewayCoins = this.props.openLedgerBackedCoins.map(coin => {
            return coin;
        })
        .sort((a, b) => {
            if (a.symbol < b.symbol)
                return -1;
            if (a.symbol > b.symbol)
                return 1;
            return 0;
        });

        let services = this.renderServices(blockTradesGatewayCoins, openLedgerGatewayCoins);

        let options = services.map((services_obj, index) => {
            let coin = coinDefinition.find(i=>i.name==this.props.changedCoinName)
            let isDeposit = ~window.location.pathname.indexOf("deposit")
            let isService = isDeposit ? coin.deposit.find(i=>i==services_obj.name) : coin.withdraw ? coin.withdraw.find(i=>i==services_obj.name) : null
            return isService ? <option key={index} value={index}>{services_obj.name}</option> : null ;
        });

        let selectBridge = (
            <select onChange={this.onSetService.bind(this)} className="bts-select" value={activeService} >
                {options}
            </select>
        )

        let isFiatTrustyDeposit = this.props.changedCoinName.search(/rub|usd/gi) != -1

        return (
            <div className="trusty_deposit_and_withdraw">

                <TopInputs />
      
                { !options.every(i=>i==null) ? <div><TrustyInput 
                    isOpen={true}
                    input={selectBridge}
                    type={"select"}
                    label={"payment method"}
                /></div> : null }
                {

                    isFiatTrustyDeposit ? <DepositFiat currency={this.props.changedCoinName } amount={this.props.changedCoinValue} method="SBERBANK" /> : 

                    <div className="grid-content no-padding" style={{overflow: "hidden"}}>
                        {activeService && services[activeService] ? services[activeService].template : services[0].template}
                    </div>

                }
                {/*this.props.children*/}
            </div>
        );
    }
};
AccountDepositWithdraw = BindToChainState(AccountDepositWithdraw);

class DepositStoreWrapper extends React.Component {

    static propTypes = {
        deposit: React.PropTypes.bool
    };

    static defaultProps = {
        deposit: false
    };


    componentWillMount() {
        if (Apis.instance().chain_id.substr(0, 8) === "4018d784") { // Only fetch this when on BTS main net
            GatewayActions.fetchCoins.defer(); // Openledger
            GatewayActions.fetchCoins.defer({backer: "TRADE"}); // Blocktrades
        }
    }

    render() {
        return <AccountDepositWithdraw {...this.props}/>;
    }
}

export default connect(DepositStoreWrapper, {
    listenTo() {
        return [AccountStore, SettingsStore, GatewayStore, CoinStore];
    },
    getProps() {
        return {
            changedCoinName: CoinStore.getState().coinType,
            changedCoinValue: CoinStore.getState().coinValue,
            account: AccountStore.getState().currentAccount,
            viewSettings: SettingsStore.getState().viewSettings,
            openLedgerBackedCoins: GatewayStore.getState().backedCoins.get("OPEN", []),
            blockTradesBackedCoins: GatewayStore.getState().backedCoins.get("TRADE", []),
        };
    }
});
