from llm_reviewer import review_with_llm

code = 'password = "secret123"'

result = review_with_llm(code)

print(result)