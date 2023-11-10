import React from "react";
import { type KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import Tooltip from "components/porter/Tooltip";
import { Controller, useFormContext } from "react-hook-form";
import { type PorterAppFormData } from "lib/porter-apps";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import styled from "styled-components";

type Props = {
    entry: KeyValueType;
    index: number;
    remove: () => void;
    isKeyOverriding: (key: string) => boolean;
    invalidKey: (key: string) => boolean;
}
const EnvVarRow: React.FC<Props> = ({
    entry,
    index,
    remove,
    isKeyOverriding,
    invalidKey,
}) => {
    const { control: appControl, watch, setError, clearErrors, formState: { errors } } = useFormContext<PorterAppFormData>();
    const hidden = watch(`app.env.${index}.hidden`);
    const keys = watch(`app.env.${index}.key`);

    const validateKey = (key: string): boolean => {
        const isValid = !/^[0-9\s]/.test(key);
        if (!isValid) {
            setError(`app.env.${index}.key`, {
                type: "manual",
                message: "Key cannot start with a number or a space",
            });
        } else {
            clearErrors(`app.env.${index}.key`);
        }
        return isValid;
    };

    return (
        <InputWrapper>
            {entry.locked ? (
                <Tooltip
                    content={"Secrets are immutable. To edit, delete and recreate the key with your new value."}
                    position={"bottom"}
                >
                    <Input
                        placeholder="ex: key"
                        width="270px"
                        value={entry.key}
                        disabled
                        spellCheck={false}
                        override={isKeyOverriding(entry.key)}
                    />
                </Tooltip>
            ) : (
                <Controller
                    name={`app.env.${index}.key`}
                    control={appControl}
                    render={({ field: { value, onChange }, fieldState: { error } }) => (
                        <>
                            <Input
                                placeholder="ex: key"
                                width="270px"
                                value={value}
                                onChange={(e) => {
                                    validateKey(e.target.value);
                                    onChange(e.target.value);
                                }}
                                spellCheck={false}
                                override={isKeyOverriding(value)}
                                style={error ? { borderColor: '#fbc902' } : {}}
                            />
                        </>
                    )}
                />
            )}
            <Spacer x={0.5} inline />
            {hidden ? (
                entry.locked ? (
                    <Tooltip
                        content={"Secrets are immutable. To edit, delete and recreate the key with your new value."}
                        position={"bottom"}
                    >
                        <Input
                            placeholder="ex: value"
                            width="270px"
                            value={entry.value}
                            disabled
                            type={"password"}
                            spellCheck={false}
                            override={isKeyOverriding(entry.key)}
                        />
                    </Tooltip>
                ) : (
                    <Controller
                        name={`app.env.${index}.value`}
                        control={appControl}
                        render={({ field: { value, onChange } }) => (
                            <Input
                                placeholder="ex: value"
                                width="270px"
                                value={value}
                                onChange={(e) => { onChange(e.target.value); }}
                                type={"password"}
                                spellCheck={false}
                                override={isKeyOverriding(entry.key)}
                            />
                        )}
                    />
                )
            ) : (
                <Controller
                    name={`app.env.${index}.value`}
                    control={appControl}
                    render={({ field: { value, onChange } }) => (
                        <MultiLineInputer
                            placeholder="ex: value"
                            width="270px"
                            value={value}
                            onChange={(e) => { onChange(e.target.value); }}
                            rows={value?.split("\n").length}
                            spellCheck={false}
                            override={isKeyOverriding(entry.key)}
                        />
                    )}
                />
            )}
            {hidden ? (
                <Controller
                    name={`app.env.${index}.hidden`}
                    control={appControl}
                    render={({ field: { value, onChange } }) => (
                        <HideButton
                            onClick={() => {
                                onChange(!value)
                            }}
                            disabled={entry.locked}
                        >
                            <i className="material-icons">lock_open</i>
                        </HideButton>
                    )}
                />
            ) : (
                <Tooltip
                    content={"Click to turn this variable into a secret"}
                    position={"bottom"}
                >
                    <Controller
                        name={`app.env.${index}.hidden`}
                        control={appControl}
                        render={({ field: { value, onChange } }) => (
                            <HideButton
                                onClick={() => {
                                    onChange(!value)
                                }}
                                disabled={entry.locked}
                            >
                                <i className="material-icons">lock</i>
                            </HideButton>
                        )}
                    />
                </Tooltip>
            )}
            <DeleteButton
                onClick={() => {
                    remove()
                }}
            >
                <i className="material-icons">cancel</i>
            </DeleteButton>
            {!invalidKey(keys) && (
                <>
                    <Spacer x={1} inline />
                    <Text color={'#fbc902'}>Key cannot start with a number or a space</Text>
                </>
            )}
            {isKeyOverriding(entry.key) && (
                <>
                    <Spacer x={1} inline />
                    <Text color={'#6b74d6'}>Key is overriding value in an environment group</Text>
                </>
            )}
        </InputWrapper>
    );
};
export default EnvVarRow;


const InputWrapper = styled.div`
            display: flex;
            align-items: center;
            margin-top: 5px;

            `;

type InputProps = {
    disabled?: boolean;
    width: string;
    override?: boolean;
};

const Input = styled.input<InputProps>`
                outline: none;
                border: none;
                margin-bottom: 5px;
                font-size: 13px;
                background: #ffffff11;
                border: ${(props) => (props.override ? '2px solid #6b74d6' : ' 1px solid #ffffff55')};
                border-radius: 3px;
                width: ${(props) => props.width ? props.width : "270px"};
                color: ${(props) => props.disabled ? "#ffffff44" : "white"};
                padding: 5px 10px;
                height: 35px;
                `;

const MultiLineInputer = styled.textarea<InputProps>`
                    outline: none;
                    border: none;
                    margin-bottom: 5px;
                    font-size: 13px;
                    background: #ffffff11;
                    border: ${(props) => (props.override ? '2px solid #6b74d6' : ' 1px solid #ffffff55')};
                    border-radius: 3px;
                    min-width: ${(props) => (props.width ? props.width : "270px")};
                    max-width: ${(props) => (props.width ? props.width : "270px")};
                    color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
                    padding: 8px 10px 5px 10px;
                    min-height: 35px;
                    max-height: 100px;
                    white-space: nowrap;

                    ::-webkit-scrollbar {
                        width: 8px;
                    :horizontal {
                        height: 8px;
    }
  }

                    ::-webkit-scrollbar-corner {
                        width: 10px;
                    background: #ffffff11;
                    color: white;
  }

                    ::-webkit-scrollbar-track {
                        width: 10px;
                    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
                    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

                    ::-webkit-scrollbar-thumb {
                        background - color: darkgrey;
                    outline: 1px solid slategrey;
  }
                    `;

const DeleteButton = styled.div`
                    width: 15px;
                    height: 15px;
                    display: flex;
                    align-items: center;
                    margin-left: 8px;
                    margin-top: -3px;
                    justify-content: center;

  > i {
                        font - size: 17px;
                    color: #ffffff44;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    :hover {
                        color: #ffffff88;
    }
  }
                    `;

const HideButton = styled(DeleteButton)`
                    margin-top: -5px;
  > i {
                        font - size: 19px;
                    cursor: ${(props: { disabled: boolean }) =>
        props.disabled ? "default" : "pointer"};
                    :hover {
                        color: ${(props: { disabled: boolean }) =>
        props.disabled ? "#ffffff44" : "#ffffff88"};
    }
  }
                    `;