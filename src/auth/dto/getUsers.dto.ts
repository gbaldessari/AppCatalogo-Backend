import { Apps } from "../schema/user.schema";

export class GetUsersDto {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  appAccess: Apps;
}