import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({query:vi.fn(),release:vi.fn(),audit:vi.fn()}));
vi.mock("../src/config/database",()=>({databasePool:{connect:async()=>({query:mocks.query,release:mocks.release})}}));
vi.mock("../src/services/audit.service",()=>({AuditService:class{record=mocks.audit;}}));
import {PartRequestRepository} from "../src/repositories/part-request.repository";
const repository=new PartRequestRepository();
const request={id:"req",work_order_id:"order",inventory_item_id:"part",quantity:"2.50",status:"PENDING"};
const arrange=(options:{status?:string;stock?:number;total?:number|null;assigned?:string}={})=>{
 mocks.query.mockImplementation(async(sql:string)=>{
  if(sql.startsWith("SELECT * FROM part_requests"))return{rows:[{...request,status:options.status??"PENDING"}],rowCount:1};
  if(sql.startsWith("SELECT status,total_amount"))return{rows:[{status:"IN_PROGRESS",total_amount:options.total===undefined?100:options.total}],rowCount:1};
  if(sql.startsWith("SELECT stock_quantity"))return{rows:[{stock_quantity:options.stock??10,is_active:true}],rowCount:1};
  if(sql.startsWith("SELECT assigned_worker_id"))return{rows:[{assigned_worker_id:options.assigned??"operator",status:"IN_PROGRESS"}],rowCount:1};
  return{rows:[],rowCount:0};
 });
};
beforeEach(()=>{vi.clearAllMocks();arrange();});
describe("part request approval and billing",()=>{
 it("deducts stock and adds the approved sale price to the total in one transaction",async()=>{
  await expect(repository.review("reviewer","req","APPROVED",12.34,null)).resolves.toMatchObject({chargeAmount:30.85});
  expect(mocks.query).toHaveBeenCalledWith("UPDATE work_orders SET total_amount=total_amount+$2 WHERE id=$1",["order",30.85]);
  expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE inventory_items"),["part","2.50","reviewer"]);
  expect(mocks.query).toHaveBeenCalledWith("COMMIT");expect(mocks.audit).toHaveBeenCalledOnce();
 });
 it("rejects a second approval without changing charges or stock",async()=>{
  arrange({status:"APPROVED"});await expect(repository.review("reviewer","req","APPROVED",12,null)).rejects.toMatchObject({code:"PART_REQUEST_REVIEWED"});
  expect(mocks.query.mock.calls.some(([sql])=>String(sql).startsWith("UPDATE"))).toBe(false);expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
 });
 it("rolls back when the stock is insufficient",async()=>{
  arrange({stock:1});await expect(repository.review("reviewer","req","APPROVED",12,null)).rejects.toMatchObject({code:"INSUFFICIENT_STOCK"});
  expect(mocks.query.mock.calls.some(([sql])=>String(sql).startsWith("UPDATE"))).toBe(false);expect(mocks.audit).not.toHaveBeenCalled();
 });
 it("does not bill only the part when the service has not yet been quoted",async()=>{
  arrange({total:null});await expect(repository.review("reviewer","req","APPROVED",12,null)).rejects.toMatchObject({code:"ORDER_QUOTE_REQUIRED"});
  expect(mocks.query.mock.calls.some(([sql])=>String(sql).startsWith("UPDATE"))).toBe(false);
 });
 it("rejection does not change the order total or stock",async()=>{
  await expect(repository.review("reviewer","req","REJECTED",null,"No corresponde")).resolves.toMatchObject({status:"REJECTED",chargeAmount:null});
  expect(mocks.query.mock.calls.some(([sql])=>String(sql).includes("UPDATE work_orders")||String(sql).includes("UPDATE inventory_items"))).toBe(false);
  expect(mocks.query).toHaveBeenCalledWith("COMMIT");
 });
 it("prevents operators requesting parts on another person's order",async()=>{
  arrange({assigned:"another-operator"});await expect(repository.request("operator",{orderId:"order",itemId:"part",quantity:1,reason:"Reparación"})).rejects.toMatchObject({code:"ORDER_NOT_OWNED"});
  expect(mocks.query.mock.calls.some(([sql])=>String(sql).startsWith("INSERT"))).toBe(false);expect(mocks.release).toHaveBeenCalled();
 });
 it("rolls back stock and billing when recording the approval fails",async()=>{
  mocks.audit.mockRejectedValueOnce(new Error("AUDIT_FAILED"));
  await expect(repository.review("reviewer","req","APPROVED",12,null)).rejects.toThrow("AUDIT_FAILED");
  expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
 });
});
