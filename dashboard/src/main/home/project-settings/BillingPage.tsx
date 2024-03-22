import React, { useContext, useState } from "react";
import styled from "styled-components";

import Heading from "components/form-components/Heading";
import Loading from "components/Loading";
import Icon from "components/porter/Icon";
import Text from "components/porter/Text";
import SaveButton from "components/SaveButton";
import {
  useDeletePaymentMethod,
  usePaymentMethodList,
} from "lib/hooks/useStripe";

import { Context } from "shared/Context";
import cardIcon from "assets/credit-card.svg";
import trashIcon from "assets/trash.png";

import BillingModal from "../modals/BillingModal";

function BillingPage() {
  const { currentProject } = useContext(Context);
  const [shouldCreate, setShouldCreate] = useState(false);

  const { paymentMethods } = usePaymentMethodList();
  const { deletePaymentMethod, isDeleting } = useDeletePaymentMethod();

  const onCreate = async () => {
    setShouldCreate(false);
  };

  const onDelete = async (paymentMethodId: string) => {
    deletePaymentMethod(paymentMethodId);
  };

  if (shouldCreate) {
    return (
      <BillingModal
        onCreate={onCreate}
        back={() => setShouldCreate(false)}
        project_id={currentProject?.id}
      />
    );
  }

  return (
    <div style={{ height: "1000px" }}>
      <BillingModalWrapper>
        <Heading isAtTop={true}>Payment methods</Heading>
        <Text>This displays all configured payment methods</Text>
        <PaymentMethodListWrapper>
          {paymentMethods.map((paymentMethod, idx) => {
            return (
              <PaymentMethodContainer key={idx}>
                <Container>
                  <Icon src={cardIcon} height={"14px"} />
                  <PaymentMethodText>
                    {paymentMethod.display_brand} - **** **** ****{" "}
                    {paymentMethod.last4}
                  </PaymentMethodText>
                  <DeleteButtonContainer>
                    {isDeleting ? (
                      <Loading />
                    ) : (
                      <DeleteButton onClick={() => onDelete(paymentMethod.id)}>
                        <Icon src={trashIcon} height={"14px"} />
                      </DeleteButton>
                    )}
                  </DeleteButtonContainer>
                </Container>
              </PaymentMethodContainer>
            );
          })}
        </PaymentMethodListWrapper>
        <SaveButtonContainer>
          <SaveButton
            makeFlush={true}
            clearPosition={true}
            onClick={() => setShouldCreate(true)}
          >
            <i className="material-icons">add</i>
            Add Payment Method
          </SaveButton>
        </SaveButtonContainer>
      </BillingModalWrapper>
    </div>
  );
}

export default BillingPage;

const PaymentMethodListWrapper = styled.div`
  width: 100%;
  max-height: 500px;
  overflow-y: auto;
`;

const BillingModalWrapper = styled.div`
  width: 60%;
  min-width: 600px;
`;

const SaveButtonContainer = styled.div`
  position: relative;
  margin-top: 20px;
`;

const PaymentMethodContainer = styled.div`
  color: #aaaabb;
  border-radius: 5px;
  padding: 5px;
  padding-left: 10px;
  display: block;
  width: 100%;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid ${({ theme }) => theme.border};
  margin-bottom: 10px;
  margin-top: 5px;
`;

const Container = styled.div`
  padding: 5px;
  display: flex;
  justify-content: space-around;
  align-items: center;
`;

const PaymentMethodText = styled.span`
  font-size: 0.8em;
  margin-right: 5px;
`;

const DeleteButton = styled.div`
  display: inline-block;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 10px;
  text-align: center;
  border: 1px solid #ffffff55;
  border-radius: 4px;
  background: #ffffff11;
  color: #ffffffdd;
  cursor: pointer;
  width: 120px;
  :hover {
    background: #ffffff22;
  }
`;

const DeleteButtonContainer = styled.div`
  width: 20%;
  text-align: right;
  margin-top: 12px;
`;
