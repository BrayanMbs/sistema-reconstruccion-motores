import express from "express";
import httpRequest from "supertest";
import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({review:vi.fn(),request:vi.fn(),list:vi.fn()}));
vi.mock("../src/services/auth.service",()=>({AuthService:class{async authenticateToken(role:string){return {id:"actor",role,mustChangePassword:false};}}}));
vi.mock("../src/repositories/part-request.repository",()=>({PartRequestRepository:class{review=mocks.review;request=mocks.request;list=mocks.list;}}));
import {partRequestRouter} from "../src/routes/part-request.routes";
import {errorHandler} from "../src/middlewares/error.middleware";
const app=express();app.use(express.json());app.use("/parts",partRequestRouter);app.use(errorHandler);
const id="00000000-0000-0000-0000-000000000001";
beforeEach(()=>{vi.clearAllMocks();mocks.review.mockResolvedValue({id,status:"APPROVED"});});
describe("part approval authorization",()=>{
 it("requires authentication",async()=>{expect((await httpRequest(app).get("/parts")).status).toBe(401);});
 it.each(["OPERATOR","CASHIER","ADMINISTRATIVE"])("prevents %s from approving",async(role)=>{
  expect((await httpRequest(app).post(`/parts/${id}/review`).set("Authorization",`Bearer ${role}`).send({decision:"APPROVED",unitPrice:10})).status).toBe(403);
  expect(mocks.review).not.toHaveBeenCalled();
 });
 it.each(["ADMIN","INVENTORY"])("allows %s to approve with an explicit sale price",async(role)=>{
  expect((await httpRequest(app).post(`/parts/${id}/review`).set("Authorization",`Bearer ${role}`).send({decision:"APPROVED",unitPrice:10})).status).toBe(200);
  expect(mocks.review).toHaveBeenCalledWith("actor",id,"APPROVED",10,null);
 });
 it("does not allow an operator to list all workshop requests",async()=>{
  expect((await httpRequest(app).get("/parts").set("Authorization","Bearer OPERATOR")).status).toBe(422);expect(mocks.list).not.toHaveBeenCalled();
 });
 it("requires a price for approval and a reason for rejection",async()=>{
  expect((await httpRequest(app).post(`/parts/${id}/review`).set("Authorization","Bearer ADMIN").send({decision:"APPROVED"})).status).toBe(422);
  expect((await httpRequest(app).post(`/parts/${id}/review`).set("Authorization","Bearer INVENTORY").send({decision:"REJECTED"})).status).toBe(422);
  expect(mocks.review).not.toHaveBeenCalled();
 });
});
