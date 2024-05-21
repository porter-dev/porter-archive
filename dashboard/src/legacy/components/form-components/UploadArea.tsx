import React, { Component } from "react";
import styled from "styled-components";
import upload from "assets/upload.svg";

type PropsType = {
  label?: string;
  setValue: (x: string) => void;
  width?: string;
  height?: string;
  placeholder?: string;
  isRequired?: boolean;
};

type StateType = {
  fileName: string;
};

export default class UploadArea extends Component<PropsType, StateType> {
  state = {
    fileName: "",
  };
  handleChange = (e: any) => {
    this.props.setValue(e.target.value);
  };

  readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      let text = e.target?.result as string;
      this.props.setValue(text);
    };
    reader.readAsText(file, "UTF-8");
    this.setState({ fileName: file.name });
  };

  render() {
    let { label, placeholder } = this.props;
    if (this.state.fileName) {
      placeholder = `Uploaded ${this.state.fileName}`;
    }

    return (
      <StyledUploadArea>
        <Label>
          {label}
          <Required>{this.props.isRequired ? " *" : null}</Required>
        </Label>
        <DNDArea
          onDragOver={(e: any) => {
            e.preventDefault();
          }}
          onDragEnter={(e: any) => {
            e.preventDefault();
          }}
          onDragLeave={(e: any) => {
            e.preventDefault();
          }}
          onDrop={(e: any) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            this.readFile(files[0]);
          }}
          onClick={() => {
            document.getElementById("file")?.click();
          }}
        >
          <input
            id="file"
            hidden
            type="file"
            accept=".json"
            onChange={(event) => {
              event.preventDefault();
              if (!event?.target?.files) {
                return;
              }
              this.readFile(event.target.files[0]);
              event.currentTarget.value = "";
            }}
          />
          <Message>
            <img src={upload} style={{ marginRight: "6px", height: "16px" }} />{" "}
            {placeholder}
          </Message>
        </DNDArea>
      </StyledUploadArea>
    );
  }
}

const Message = styled.div`
  display: flex;
  align-items: center;
  vertical-align: middle;
  font-size: 13px;
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
`;

const DNDArea = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  outline: none;
  border: none;
  resize: none;
  font-size: 14px;
  background: #ffffff11;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  color: grey;
  padding: 5px 10px;
  margin-right: 8px;
  width: 100%;
  height: 80px;
  cursor: pointer;
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const StyledUploadArea = styled.div`
  margin-bottom: 20px;
`;
