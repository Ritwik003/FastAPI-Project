
"""
from pydantic import BaseModel , Field ,field_validator ,EmailStr , model_validator , computed_field
from typing import Dict, List ,Annotated

#Used Fields, annotated , field_validator , model_validator and computed_field  , nested_model ,type_validation

class Address(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str

class Patient(BaseModel):
    name : Annotated[str , Field(min_length=1,title="Patient Name", description="The name of the patient" ,example="John Doe")]
    age :int 
    weight : float = Field(gt = 0)
    height : Annotated[float , Field(gt = 0 , strict = True)]
    email :EmailStr
    bmi :float
    allergies :List[str]
    contact_details : Dict[str, str]
    address : Address

    @field_validator("email")
    @classmethod
    def email_validator(cls, value):
        validate_email= ["hdfc.com" , "icici.com"]
        domain_name = value.split("@")[-1]
        if domain_name not in validate_email:
            raise ValueError("Invalid email domain")
        return value
    
    @field_validator("age" , mode = "After")
    @classmethod
    def age_validatror(cls, value):
        if value < 0  and  value >120:
            return value
        else:
            raise ValueError("Invalid age value")
        
    @model_validator(mode= 'after')
    @classmethod
    def contact_details_validators(cls, model):
        if model.age > 60 and "emergency" not in model.contact_details:
            raise ValueError("Emergency contact details are required for patients above 60 years old")
        return model
    
    @computed_field
    @property
    def calculate_bmi(self) -> float:
        bmi  = (round(self.weight / (self.height / 100) ** 2),2)
        return bmi
        




def insert_patient(patient: Patient):
    print(f"Inserting patient: {patient.name}, Age: {patient.age}")
    print('BMI', patient.calculate_bmi)

Address_info = {'street': '123 Main St', 'city': 'Anytown', 'state': 'CA', 'zip_code': '12345'}
Address1 = Address(**Address_info)

Patient_info = { 'name':'nitish', 'age': 30, 'weight': 75.2, 'height': 175.0, 'bmi': 24.5, 'allergies': ['penicillin', 'shellfish'], 'contact_details':{'phone':'2353462'} ,'address': Address1}
Patient1 = Patient(**Patient_info)

insert_patient(Patient1)


temp = Patient1.model_dump() #for dumping the data of the object 
temp = Patient1.model_dump_json() # for dumping the data of the object in json format
print(temp)
print(type(temp))

"""

from pydantic import BaseModel , Field ,field_validator ,EmailStr , model_validator , computed_field
from typing import Dict, List ,Annotated ,Literal ,Optional

class Patient(BaseModel):

    id :Annotated[str , Field(..., description="The unique identifier for the patient" , examples=["P001"])]
    name :Annotated[str , Field(..., description="The name of the patient" )]
    city :Annotated[str , Field(..., description="The city where the patient resides" )]
    age: Annotated[int , Field(..., description="The age of the patient" , ge=0 , le=100)]
    gender : Annotated[Literal["male" , "female" , "others"] ,Field(..., description = "Provide the gender of the patient")]
    height : Annotated[float , Field(..., description="The height of the patient in mtrs" , gt=0)]
    weight : Annotated[float , Field(..., description="The weight of the patient in kg" , gt=0)]
    doctor_id: Annotated[int , Field(..., description="The ID of the doctor assigned to the patient")]  

    @computed_field
    @property
    def bmi(self) ->float:
        bmi = round(self.weight / (self.height ** 2),2)
        return bmi
    
    @computed_field
    @property
    def verdict(self) ->str:
        bmi = self.bmi
        if bmi < 18.5:
            return "Underweight"
        elif 18.5 <= bmi < 25:
            return "Normal weight"
        elif 25 <= bmi < 30:
            return "Overweight"
        else:
            return "Obese"
        
class PatientsUpdate(BaseModel):
    name: Annotated[Optional[str], Field(default=None)]
    city: Annotated[Optional[str], Field(default=None)]
    age: Annotated[Optional[int], Field(default=None, gt=0)]
    gender: Annotated[Optional[Literal['male', 'female']], Field(default=None)]
    height: Annotated[Optional[float], Field(default=None, gt=0)]
    weight: Annotated[Optional[float], Field(default=None, gt=0)]
    doctor_id: Annotated[Optional[int], Field(default=None)]
    
