import Loading from "components/Loading";
import React, { useRef, useState } from "react";
import { useOutsideAlerter } from "shared/hooks/useOutsideAlerter";
import styled from "styled-components";

interface Props {
    values: any[];
    currentValue: any;
    onChange: (provider: any) => void;
}
const ProviderSelector: React.FC<Props> = ({
    values,
    currentValue,
    onChange
}) => {
    const wrapperRef = useRef();
    const [isOpen, setIsOpen] = useState(false);
    const icon = `devicon-${currentValue?.provider}-plain colored`;
    useOutsideAlerter(wrapperRef, () => {
        setIsOpen(false);
    });

    if (!currentValue) {
        return (
            <ProviderSelectorStyles.Wrapper>
                <Loading />
            </ProviderSelectorStyles.Wrapper>
        );
    }

    return (
        <>
            <ProviderSelectorStyles.Wrapper ref={wrapperRef} isOpen={isOpen}>
                <ProviderSelectorStyles.Icon className={icon} />

                <ProviderSelectorStyles.Button
                    onClick={() => setIsOpen((prev) => !prev)}
                >
                    {currentValue?.name || currentValue?.instance_url}
                </ProviderSelectorStyles.Button>
                <i className="material-icons">arrow_drop_down</i>
                {isOpen ? (
                    <>
                        <ProviderSelectorStyles.OptionWrapper>
                            {values.map((provider, index) => {
                                return (
                                    <ProviderSelectorStyles.Option
                                        onClick={() => {
                                            setIsOpen(false);
                                            onChange(provider);
                                        }}
                                        key={index}
                                    >
                                        <ProviderSelectorStyles.Icon
                                            className={`devicon-${provider?.provider}-plain colored`}
                                        />
                                        <ProviderSelectorStyles.Text>
                                            {provider?.name || provider?.instance_url}
                                        </ProviderSelectorStyles.Text>
                                    </ProviderSelectorStyles.Option>
                                );
                            })}
                        </ProviderSelectorStyles.OptionWrapper>
                    </>
                ) : null}
            </ProviderSelectorStyles.Wrapper>
        </>
    );
};

export default ProviderSelector;

const ProviderSelectorStyles = {
    Wrapper: styled.div<{ isOpen?: boolean }>`
      position: relative;
      margin-bottom: 10px;
      height: 40px;
      display: flex;
      min-width: 50%;
      cursor: pointer;
      margin-right: 10px;
      margin-left: 2px;
      align-items: center;
  
      > i {
        margin-left: -26px;
        margin-right: 10px;
        z-index: 0;
        transform: ${(props) => (props.isOpen ? "rotate(180deg)" : "")};
      }
    `,
    Button: styled.div`
      height: 100%;
      font-weight: bold;
      font-size: 14px;
      border-bottom: 0;
      z-index: 999;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 6px 15px;
      padding-left: 40px;
      padding-right: 28px;
      border-bottom: 2px solid #ffffff;
      padding-top: 11px;
    `,
    OptionWrapper: styled.div`
      top: 40px;
      position: absolute;
      background: #37393f;
      border-radius: 3px;
      max-height: 300px;
      overflow-y: auto;
      width: calc(100% - 4px);
      box-shadow: 0 8px 20px 0px #00000088;
      z-index: 999;
    `,
    Option: styled.div`
      display: flex;
      align-items: center;
  
      :hover {
        background-color: #ffffff22;
      }
    `,
    Icon: styled.span`
      font-size: 20px;
      filter: invert(1);
      margin-left: 9px;
      margin-right: -29px;
      color: white;
    `,
    Text: styled.div`
      font-weight: bold;
      font-size: 14px;
      margin-left: 40px;
      height: 45px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 8px 10px;
      width: 100%;
      padding-top: 14px;
      padding-left: 0;
    `,
};