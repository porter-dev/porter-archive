import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import styled from "styled-components";
import Icon from "components/porter/Icon";
import trashIcon from "assets/trash.png"
import cardIcon from "assets/credit-card.svg"

import { Context } from "shared/Context";
import BillingModal from "../modals/BillingModal";
import Error from "components/porter/Error";
import Loading from "components/Loading";

function BillingPage() {
  const { user, currentProject } = useContext(Context);

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [shouldCreate, setShouldCreate] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(false);

  useEffect(() => {
    (async () => {
      await api.checkBillingCustomerExists("<token>", { user_email: user?.email }, { project_id: currentProject?.id })
      const listResponse = await api.listPaymentMethod("<token>", {}, { project_id: currentProject?.id })
      const paymentMethodList = listResponse.data === null ? [] : listResponse.data
      setPaymentMethods(paymentMethodList)
    })();
  }, []);

  const onCreate = async () => {
    // Refetch the payment method list since Stripe won't return the newly
    // created payment method
    const listResponse = await api.listPaymentMethod("<token>", {}, { project_id: currentProject?.id })
    const paymentMethodList = listResponse.data === null ? [] : listResponse.data
    setPaymentMethods(paymentMethodList)
    setShouldCreate(false)
  }

  const deletePaymentMethod = async (paymentMethod) => {
    setDeleteStatus(true)
    const resp = await api.deletePaymentMethod("<token>", {}, { project_id: currentProject?.id, payment_method_id: paymentMethod.id })
    if (resp.status !== 200) {
      return <Error message="failed to delete payment method" />
    }

    setDeleteStatus(false)
    setPaymentMethods(paymentMethods.filter(elem => elem !== paymentMethod))
  }

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
        <Helper>
          This displays all configured payment methods
        </Helper>
        <PaymentMethodListWrapper>
          {
            paymentMethods.map((paymentMethod, idx) => {
              return (
                <PaymentMethodContainer key={idx}>
                  <Container>
                    <Icon src={cardIcon} height={"14px"} />
                    <PaymentMethodText>{paymentMethod.card.display_brand} - **** **** **** {paymentMethod.card.last4}</PaymentMethodText>
                    <DeleteButtonContainer>
                      {
                        deleteStatus ? <Loading /> : <DeleteButton onClick={() => deletePaymentMethod(paymentMethod)} status={deleteStatus}>
                          <Icon src={trashIcon} height={"14px"} />
                        </DeleteButton>
                      }
                    </DeleteButtonContainer>
                  </Container>
                </PaymentMethodContainer>
              )
            })
          }
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
