export interface IAddress {
  city: string;
  street: string;
  house: string;
}

export interface IOrganization {
  id: string;
  name: string;
  director: string;
  phone: string;
  address: IAddress;
}